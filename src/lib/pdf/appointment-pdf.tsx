import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10.5, fontFamily: "Helvetica", lineHeight: 1.45, color: "#171717" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  letter: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 6 },
  sig: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 4, padding: 8, marginBottom: 6 },
  sigName: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#525252", fontSize: 9 },
  banner: { backgroundColor: "#fef3c6", padding: 6, marginBottom: 12, fontSize: 9 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 8, color: "#737373" },
});

export type PdfSignature = {
  name: string;
  party: string;
  typedName: string | null;
  signedAt: string | null;
  ip: string | null;
};

// The issued letter, word for word, followed by a signature block for each
// party and a footer carrying the letter's fingerprint.
export function AppointmentPdf(props: {
  title: string;
  text: string;
  sha256: string;
  templateVersion: string;
  appointmentId: string;
  status: string;
  voidReason: string | null;
  signatures: PdfSignature[];
  generatedAt: string;
}) {
  return (
    <Document title={props.title} author="Dutyholder" subject="Part 2A appointment">
      <Page size="A4" style={styles.page}>
        {props.status === "void" && <Text style={styles.banner}>VOID: {props.voidReason}</Text>}
        {props.status === "awaiting_signatures" && (
          <Text style={styles.banner}>Not yet signed by all parties.</Text>
        )}
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.letter}>{props.text}</Text>

        <Text style={styles.sectionTitle}>Signatures</Text>
        {props.signatures.map((s, i) => (
          <View key={i} style={styles.sig} wrap={false}>
            <Text>
              <Text style={styles.sigName}>{s.name}</Text> · {s.party}
            </Text>
            {s.signedAt ? (
              <Text style={styles.muted}>
                Signed electronically as &quot;{s.typedName}&quot; on {s.signedAt}
                {s.ip ? ` from IP address ${s.ip}` : ""}
              </Text>
            ) : (
              <Text style={styles.muted}>Not signed.</Text>
            )}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Document SHA-256 {props.sha256} · template {props.templateVersion} · ref {props.appointmentId} · generated{" "}
          {props.generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
