import dayjs from "dayjs";

// Reads a CSV export into rows keyed by lower-case header. Handles quoted values with commas.
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

// First non-empty value among the header names a supplier might use.
export const pick = (row: Record<string, string>, names: string[]) =>
  names.map((n) => row[n.replace(/[^a-z0-9]/g, "")]).find((v) => v !== undefined && v !== "") ?? "";

// Accepts 2026-11-19, 19/11/2026 or 19-11-2026; returns YYYY-MM-DD or "".
export const parseDate = (value: string) => {
  const v = value.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dayjs(v).isValid() ? v : "";
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return "";
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dayjs(iso).isValid() ? iso : "";
};

export const parseAmount = (value: string) => {
  const n = Number(value.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export const normaliseReg = (value: string) => value.toUpperCase().replace(/\s+/g, "");
