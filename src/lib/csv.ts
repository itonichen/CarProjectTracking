/** RFC 4180 CSV. Values that spreadsheets would run as formulas are prefixed with '. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
