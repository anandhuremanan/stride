// Date and text formatting. Dates arrive from the API as `yyyy-mm-dd` (days)
// or ISO timestamps; relative times are measured against the server's clock.

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** "16 Oct" */
export const formatDay = (iso: string) => dayMonth.format(parseDay(iso));
/** "16 Oct 2026" */
export const formatDate = (iso: string) => dayMonthYear.format(parseDay(iso));
/** "Fri, 16 Oct 2026" */
export const formatLongDate = (iso: string) => longDay.format(parseDay(iso));
/** Day of the month, for chart ticks. */
export const dayOfMonth = (iso: string) => parseDay(iso).getDate();

/** "12–23 Oct 2026", "28 Sep–9 Oct 2026", "31 Aug–11 Sep 2026" */
export function formatRange(start: string, end: string, withYear = true) {
  const a = parseDay(start);
  const b = parseDay(end);
  const tail = withYear ? dayMonthYear.format(b) : dayMonth.format(b);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${tail}`;
  return `${dayMonth.format(a)}–${tail}`;
}

/** "Today", "Tomorrow", "28 Oct", relative to the server's today. */
export function formatDue(iso: string | null, today: string, empty = "Not set") {
  if (!iso) return empty;
  if (iso === today) return "Today";
  const diff = Math.round((parseDay(iso).getTime() - parseDay(today).getTime()) / 864e5);
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(iso);
}

/** "Just now", "24 minutes ago", "Today at 09:10", "Yesterday at 16:20", "12 Oct at 10:30" */
export function formatRelative(isoTime: string, nowIso: string) {
  const t = new Date(isoTime);
  const now = new Date(nowIso);
  const minutes = Math.round((now.getTime() - t.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.floor((startOfToday.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5);
  if (dayDiff <= 0 && minutes < 180) return `${Math.round(minutes / 60)} ${Math.round(minutes / 60) === 1 ? "hour" : "hours"} ago`;
  if (dayDiff <= 0) return `Today at ${time.format(t)}`;
  if (dayDiff === 1) return `Yesterday at ${time.format(t)}`;
  return `${dayMonth.format(t)} at ${time.format(t)}`;
}

/** "Today, 09:12" style stamp for comments. */
export function formatStamp(isoTime: string, nowIso: string) {
  const rel = formatRelative(isoTime, nowIso);
  return rel.replace(" at ", ", ");
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const firstName = (name: string) => name.split(" ")[0];

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
