import { useCallback, useEffect, useRef } from "preact/hooks";

export type DebouncedCallback<T extends unknown[] = unknown[]> = (
  ...args: T
) => void | Promise<void> | unknown | Promise<unknown>;

/**
 * useDebouncedCallback — debounces a callback function
 * Returns a stable debounced version of `fn` that fires only after `delay` ms
 * of silence. Includes a `cancel()` method to abort any pending call.
 */
export function useDebouncedCallback<
  T extends unknown[] = unknown[],
>(
  fn: DebouncedCallback<T>,
  delay: number,
): DebouncedCallback<T> & { cancel: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef<DebouncedCallback<T>>(fn);

  // Keep fnRef current so the callback always calls the latest version of fn
  // without resetting the debounce timer.
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback<DebouncedCallback<T>>(
    (...args) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delay);
    },
    [delay, cancel],
  );

  // Clean up on unmount
  useEffect(() => cancel, [cancel]);

  return Object.assign(debounced, { cancel });
}
