import { useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { CheckIcon, CopyCheckIcon, CopyIcon } from "lucide-preact";

export type CopyToClipboardBtnProps = {
  text: string;
};

export default function CopyToClipboardBtn({ text }: CopyToClipboardBtnProps) {
  const isCopied = useSignal(false);

  const clearIsCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    if (clearIsCopiedTimeoutRef.current) {
      clearTimeout(clearIsCopiedTimeoutRef.current);
    }
    isCopied.value = true;
    clearIsCopiedTimeoutRef.current = setTimeout(() => {
      isCopied.value = false;
      clearIsCopiedTimeoutRef.current = null;
    }, 1500);
  }

  return (
    <div class="tooltip">
      <div class="tooltip-content">
        <p class="text-xs">
          {isCopied.value
            ? (
              <span class="flex items-center gap-x-1">
                <CheckIcon size={16} class="text-success" />
                Copied!
              </span>
            )
            : "Copy to clipboard"}
        </p>
      </div>
      <button type="button" class="btn btn-sm btn-square" onClick={handleClick}>
        {isCopied.value
          ? <CopyCheckIcon size={16} class="text-success-content" />
          : <CopyIcon size={16} />}
      </button>
    </div>
  );
}
