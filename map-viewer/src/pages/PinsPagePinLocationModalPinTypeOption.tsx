import { ComponentChildren } from "preact";

export type PinsPagePinLocationModalPinTypeOptionProps = {
  pinType: "live" | "marker" | "coordinates";
  selectedPinType: "live" | "marker" | "coordinates" | null;
  icon: ComponentChildren;
  title: string;
  description: string;
  children?: ComponentChildren;
  onSelectedPinChange?: (value: "live" | "marker" | "coordinates") => void;
};

export default function PinsPagePinLocationModalPinTypeOption(
  {
    pinType,
    selectedPinType,
    icon,
    title,
    description,
    children,
    onSelectedPinChange,
  }: PinsPagePinLocationModalPinTypeOptionProps,
) {
  const isSelected = pinType === selectedPinType;

  return (
    <article
      class={`px-3 pt-3 pb-4 rounded-lg border-t border-l border-b border-r ${
        isSelected ? "border-primary" : "border-base-content/20"
      }`}
    >
      <div class="flex items-start gap-x-3">
        <input
          type="radio"
          name="selected-pin-type"
          value={pinType}
          checked={isSelected}
          class={`radio radio-md ${isSelected ? "radio-primary" : ""}`}
          onChange={() => onSelectedPinChange?.(pinType)}
        />
        <div>
          <h4
            class={`flex items-center gap-x-2 font-bold mb-2 cursor-pointer ${
              isSelected ? "text-primary" : "text-base-content"
            }`}
            onClick={() => onSelectedPinChange?.(pinType)}
          >
            {icon}
            <span>
              {title}
            </span>
          </h4>
          <p class="text-base-content/80 text-sm">
            {description}
          </p>
          {isSelected && (
            <div class="mt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
