// Accepts both "6,25" and "6.25" (Dutch iOS keyboards produce a comma)
export function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const match = cleaned.match(/^(\d{0,4})([.,]?)(\d{0,3})/);
  if (!match) return "";
  const [, whole, sep, fraction] = match;
  return sep ? `${whole}${sep}${fraction}` : whole;
}

export function sanitizeInteger(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function parseDecimal(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (normalized === "" || normalized === ".") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatKg(n: number): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: 3 });
}

export function volumeParts(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: (kg / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 }), unit: "t" };
  return { value: Math.round(kg).toLocaleString("nl-NL"), unit: "kg" };
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} t`;
  return `${Math.round(kg).toLocaleString("nl-NL")} kg`;
}

export function parseRestSeconds(rest: string | undefined | null): number {
  if (!rest) return 90;
  const clock = rest.trim().match(/^(\d+):(\d{1,2})$/);
  if (clock) return parseInt(clock[1]) * 60 + parseInt(clock[2]);
  const numbers = rest.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return 90;
  const max = Math.max(...numbers);
  return /min/i.test(rest) && !/sec/i.test(rest) ? max * 60 : max;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function formatMonth(date: Date): string {
  const s = date.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
