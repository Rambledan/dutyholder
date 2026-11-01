import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Never hyphenate: a hyphen inserted into a SHA-256 fingerprint or a file
// path would make it wrong when copied. Long values are split explicitly.
Font.registerHyphenationCallback((word) => [word]);

// A 64-character fingerprint as two 32-character lines, so it wraps cleanly.
export const hashLines = (h: string | null | undefined) => (h && h.length > 32 ? `${h.slice(0, 32)}\n${h.slice(32)}` : h ?? "—");
// A path broken after each folder, so it wraps at the slashes.
export const pathLines = (p: string) => p.split("/").join("/\n");

// One layout for every record in the evidence pack: a title, then sections
// of facts, paragraphs, quoted wording or tables, and a footer on every page
// saying where the record came from.

export type Block =
  | { type: "facts"; rows: [string, string][] }
  | { type: "text"; text: string }
  | { type: "quote"; text: string }
  | { type: "table"; columns: string[]; rows: string[][]; widths?: number[] }
  | { type: "warning"; text: string };

export type Section = { heading?: string; blocks: Block[] };

const s = StyleSheet.create({
  page: { padding: 44, paddingBottom: 56, fontSize: 9.5, fontFamily: "Helvetica", lineHeight: 1.45, color: "#171717" },
  kicker: { fontSize: 8, color: "#737373", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#525252", marginBottom: 14 },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 6 },
  factRow: { flexDirection: "row", marginBottom: 2 },
  factKey: { width: 150, color: "#525252" },
  factValue: { flex: 1 },
  text: { marginBottom: 6 },
  quote: { borderLeftWidth: 2, borderLeftColor: "#d4d4d4", paddingLeft: 8, marginBottom: 6, color: "#262626" },
  warning: { backgroundColor: "#fde2e2", color: "#9f0712", padding: 6, marginBottom: 6 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d4d4d4", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ececec", paddingVertical: 2 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingRight: 6 },
  td: { fontSize: 8.5, paddingRight: 6 },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, fontSize: 7.5, color: "#737373", flexDirection: "row", justifyContent: "space-between" },
});

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "facts":
      return (
        <View>
          {block.rows.map(([k, v], i) => (
            <View key={i} style={s.factRow} wrap={false}>
              <Text style={s.factKey}>{k}</Text>
              <Text style={s.factValue}>{v || "—"}</Text>
            </View>
          ))}
        </View>
      );
    case "text":
      return <Text style={s.text}>{block.text || "—"}</Text>;
    case "quote":
      return <Text style={s.quote}>{block.text}</Text>;
    case "warning":
      return <Text style={s.warning}>{block.text}</Text>;
    case "table": {
      const widths = block.widths ?? block.columns.map(() => 1);
      return (
        <View>
          <View style={s.tableHead} fixed>
            {block.columns.map((c, i) => <Text key={i} style={[s.th, { flex: widths[i] }]}>{c}</Text>)}
          </View>
          {block.rows.map((r, ri) => (
            <View key={ri} style={s.tableRow} wrap={false}>
              {r.map((cell, ci) => <Text key={ci} style={[s.td, { flex: widths[ci] }]}>{cell}</Text>)}
            </View>
          ))}
        </View>
      );
    }
  }
}

export function RecordPdf(props: { kicker: string; title: string; subtitle?: string; sections: Section[]; footer: string }) {
  return (
    <Document title={props.title} author="Dutyholder" subject={props.kicker}>
      <Page size="A4" style={s.page}>
        <Text style={s.kicker}>{props.kicker}</Text>
        <Text style={s.title}>{props.title}</Text>
        {props.subtitle && <Text style={s.subtitle}>{props.subtitle}</Text>}
        {props.sections.map((section, i) => (
          <View key={i}>
            {section.heading && <Text style={s.heading}>{section.heading}</Text>}
            {section.blocks.map((b, j) => <BlockView key={j} block={b} />)}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>{props.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
