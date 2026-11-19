import { TargetedMouseEvent } from "preact";
import { AdmLevelCode } from "@scope/consts/models";

export type AdmPillProps<TValue = unknown> = {
  admLevelCode: AdmLevelCode;
  text: string;
  title?: string;
  value?: TValue;
  badge?: string;
  closable?: boolean;
  size?: "md" | "sm";
  onClick?: (admLevelCode: AdmLevelCode, value?: TValue) => void;
  onClose?: (admLevelCode: AdmLevelCode, value?: TValue) => void;
};

export default function AdmPill<TValue = unknown>(
  {
    admLevelCode,
    text,
    title,
    badge,
    closable = false,
    value,
    size = "md",
    onClick,
    onClose,
  }: AdmPillProps<
    TValue
  >,
) {
  let colorClassName!: string;
  switch (admLevelCode) {
    case AdmLevelCode.PROVINCE:
      colorClassName = "btn-province";
      break;
    case AdmLevelCode.REGION:
      colorClassName = "btn-region";
      break;
    case AdmLevelCode.DISTRICT:
      colorClassName = "btn-district";
      break;
    case AdmLevelCode.COMMUNE:
      colorClassName = "btn-commune";
      break;
    case AdmLevelCode.FOKONTANY:
      colorClassName = "btn-fokontany";
      break;
    default:
      throw new Error(
        `Unknown adm level code for ADM pill component: ${admLevelCode satisfies never}`,
      );
  }

  const sizeClassName = size === "sm" ? "btn-sm" : "";

  function handleClose(e: TargetedMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onClose?.(admLevelCode, value);
  }

  return (
    <div
      tabIndex={0}
      title={title ?? text}
      class={`btn ${sizeClassName} ${colorClassName} flex items-center gap-x-2 w-fit max-w-full`}
      style="border-radius: 1.25rem"
      onClick={() => onClick?.(admLevelCode, value)}
    >
      <span class="capitalize block truncate">
        {text}
      </span>
      {typeof badge === "string" && (
        <strong class="badge badge-sm badge-base-100">
          {badge}
        </strong>
      )}
      {closable && (
        <div class="tooltip tooltip-left" data-tip="Remove">
          <button
            type="button"
            aria-label="Remove"
            class="btn btn-xs btn-neutral"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
