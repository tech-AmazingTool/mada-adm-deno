import { type Signal, useSignal } from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/hooks";

export interface UseDynamicDateTimeResult {
  /** Reactive signal holding the formatted date-time, e.g. "2:32:09 PM", "Yesterday 9:05:41 AM", "2026-07-10 9:47:03 PM" */
  dateTime: Signal<string>;
  /** Start (or restart) the dynamic date-time display for the given date */
  start: (date: Date) => void;
  /** Stop the underlying timer */
  clear: () => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Formats the time portion as a 12-hour clock with AM/PM, e.g. "2:45:07 PM".
 * A 12-hour clock with an explicit period reads faster at a glance than
 * 24-hour "14:45:07", especially once seconds are in the mix.
 */
function formatTime(date: Date): string {
  const period = date.getHours() >= 12 ? "PM" : "AM";
  const hours12 = date.getHours() % 12 || 12;
  return `${hours12}:${pad2(date.getMinutes())}:${
    pad2(date.getSeconds())
  } ${period}`;
}

function formatISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${
    pad2(date.getDate())
  }`;
}

function formatDynamicDateTime(date: Date, now: Date = new Date()): string {
  const time = formatTime(date);

  if (isSameDay(date, now)) {
    return time;
  }

  if (isYesterday(date, now)) {
    return `Yesterday ${time}`;
  }

  return `${formatISODate(date)} ${time}`;
}

/** Milliseconds until the next local midnight, i.e. when the day bucket could change. */
function getMsUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/**
 * A Preact hook (built on @preact/signals) that renders a date-time string
 * whose format depends on how far the date is from "today":
 *
 * - Same calendar day as now  -> "h:mm:ss AM/PM"
 * - The day before            -> "Yesterday h:mm:ss AM/PM"
 * - Anything else             -> "YYYY-MM-DD h:mm:ss AM/PM"
 *
 * The output only changes at day boundaries, so the underlying timer is
 * scheduled for the next local midnight rather than polling continuously.
 *
 * Call `start(date)` to begin tracking a date, and `clear()` to stop the
 * underlying timer (e.g. on unmount, or when the tracked item is removed).
 */
export default function useDynamicDateTime(
  initialDate?: Date,
): UseDynamicDateTimeResult {
  const dateTime = useSignal<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef<Date | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const date = dateRef.current;
    if (!date) return;

    dateTime.value = formatDynamicDateTime(date);

    const delay = getMsUntilNextMidnight();
    timerRef.current = setTimeout(tick, delay);
  }, []);

  const start = useCallback(
    (date: Date) => {
      clear();
      dateRef.current = date;
      dateTime.value = formatDynamicDateTime(date);

      const delay = getMsUntilNextMidnight();
      timerRef.current = setTimeout(tick, delay);
    },
    [clear, tick],
  );

  useEffect(() => {
    if (initialDate) {
      start(initialDate);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { dateTime, start, clear };
}
