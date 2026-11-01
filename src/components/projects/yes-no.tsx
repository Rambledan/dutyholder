// A yes/no question as two radio buttons.
export function YesNo(props: {
  name: string;
  legend: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{props.legend}</legend>
      {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
      <div className="flex gap-4 text-sm">
        {[true, false].map((v) => (
          <label key={String(v)} className="flex items-center gap-1.5">
            <input type="radio" name={props.name} value={v ? "yes" : "no"} checked={props.value === v}
              onChange={() => props.onChange(v)} />
            {v ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
