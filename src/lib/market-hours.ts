// NSE/BSE equity market hours (IST): Mon–Fri,
// pre-open 09:00–09:15, normal session 09:15–15:30.

export type MarketState = "open" | "pre-open" | "closed";

/** Official-style NSE trading holidays. Extend as per the NSE holiday calendar. */
export const HOLIDAYS: { date: string; name: string }[] = [
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-10-20", name: "Diwali — Laxmi Pujan*" },
  { date: "2026-12-25", name: "Christmas" },
];

export interface MarketStatus {
  state: MarketState;
  reason: string;
  /** seconds until the next session transition (open / close) */
  nextEventInSec: number;
  istTime: string;
  istDate: string;
  isHoliday: boolean;
  holidayName?: string;
}

function istParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10) % 24;
  const minute = parseInt(get("minute"), 10);
  const second = parseInt(get("second"), 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + minute,
    seconds: second,
    weekday: get("weekday"), // Sun, Mon, ...
    time: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
  };
}

const OPEN_MIN = 9 * 60 + 15;
const CLOSE_MIN = 15 * 60 + 30;
const PREOPEN_MIN = 9 * 60;

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const p = istParts(now);
  const isWeekend = p.weekday === "Sat" || p.weekday === "Sun";
  const holiday = HOLIDAYS.find((h) => h.date === p.date);
  const secsIntoMin = p.seconds;

  const secsUntil = (targetMin: number) => Math.max(0, (targetMin - p.minutes) * 60 - secsIntoMin);

  if (isWeekend) {
    // Next open: Monday 09:15 IST
    const daysAhead = p.weekday === "Sat" ? 2 : 1;
    return {
      state: "closed",
      reason: "Weekend — markets open Monday 9:15 AM IST",
      nextEventInSec: daysAhead * 86400 + secsUntil(OPEN_MIN),
      istTime: p.time,
      istDate: p.date,
      isHoliday: false,
    };
  }
  if (holiday) {
    return {
      state: "closed",
      reason: `Market holiday — ${holiday.name}`,
      nextEventInSec: 86400,
      istTime: p.time,
      istDate: p.date,
      isHoliday: true,
      holidayName: holiday.name,
    };
  }
  if (p.minutes < PREOPEN_MIN) {
    return {
      state: "closed",
      reason: "Opens today at 9:15 AM IST",
      nextEventInSec: secsUntil(OPEN_MIN),
      istTime: p.time,
      istDate: p.date,
      isHoliday: false,
    };
  }
  if (p.minutes < OPEN_MIN) {
    return {
      state: "pre-open",
      reason: "Pre-open session — opens 9:15 AM IST",
      nextEventInSec: secsUntil(OPEN_MIN),
      istTime: p.time,
      istDate: p.date,
      isHoliday: false,
    };
  }
  if (p.minutes <= CLOSE_MIN) {
    return {
      state: "open",
      reason: "Market open — closes 3:30 PM IST",
      nextEventInSec: secsUntil(CLOSE_MIN + 1),
      istTime: p.time,
      istDate: p.date,
      isHoliday: false,
    };
  }
  const nextLabel = p.weekday === "Fri" ? "Monday 9:15 AM IST" : "tomorrow 9:15 AM IST";
  return {
    state: "closed",
    reason: `Closed — opens ${nextLabel}`,
    nextEventInSec: p.weekday === "Fri" ? 3 * 86400 : 86400,
    istTime: p.time,
    istDate: p.date,
    isHoliday: false,
  };
}
