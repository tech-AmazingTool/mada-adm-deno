import { Signal, useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";

export default function useValueToSignal<T>(value: T): Signal<T> {
  const prevValueRef = useRef<T>();
  const signal = useSignal<T>(value);

  if (prevValueRef.current !== value) {
    signal.value = value;
    prevValueRef.current = value;
  }

  return signal;
}
