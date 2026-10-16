// Date helpers for the backend. Days travel as local `yyyy-mm-dd` strings.

export function now(): Date {
  return new Date();
}

/** Local `yyyy-mm-dd`. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return isoDate(now());
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Monday to Friday between two dates, inclusive. */
export function workingDays(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = parseDate(start); d <= parseDate(end); d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days.push(isoDate(d));
  }
  return days;
}
