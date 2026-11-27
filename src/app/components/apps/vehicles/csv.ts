import dayjs from 'dayjs';
import api from '@/utils/axios';

// Reads a CSV export into rows keyed by lower-case header. Handles quoted values with commas.
export function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];
    const split = (line: string) => {
        const out: string[] = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (quoted && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else quoted = !quoted;
            } else if (ch === ',' && !quoted) {
                out.push(cur.trim());
                cur = '';
            } else cur += ch;
        }
        out.push(cur.trim());
        return out;
    };
    const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    return lines.slice(1).map((line) => {
        const cells = split(line);
        return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
    });
}

// First non-empty value among the header names a supplier might use.
export const pick = (row: Record<string, string>, names: string[]) =>
    names.map((n) => row[n.replace(/[^a-z0-9]/g, '')]).find((v) => v !== undefined && v !== '') ?? '';

// Accepts 2026-11-19, 19/11/2026 or 19-11-2026; returns YYYY-MM-DD or "".
export const parseDate = (value: string) => {
    const v = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dayjs(v).isValid() ? v : '';
    const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!m) return '';
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return dayjs(iso).isValid() ? iso : '';
};

export const parseAmount = (value: string) => {
    const n = Number(value.replace(/[£,\s]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};

export const normaliseReg = (value: string) => value.toUpperCase().replace(/\s+/g, '');

// Builds the file on the server (same Excel layout as the time clock export) and downloads it.
// numberColumns / moneyColumns are column indexes saved as numbers (money with 2 decimals).
export async function downloadExcel(
    fileName: string,
    columns: string[],
    rows: (string | number | null | undefined)[][],
    options: { numberColumns?: number[]; moneyColumns?: number[] } = {},
) {
    const res = await api.post('vehicles/export', {
        file_name: fileName,
        columns,
        rows: rows.map((r) => r.map((v) => v ?? '')),
        number_columns: options.numberColumns ?? [],
        money_columns: options.moneyColumns ?? [],
    });
    const {file, filename, contentType} = res.data.data;
    const bytes = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type: contentType}));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
