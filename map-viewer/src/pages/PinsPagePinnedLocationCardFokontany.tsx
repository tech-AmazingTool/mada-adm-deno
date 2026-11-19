import { useSignal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import { ChevronDown, LandmarkIcon, TriangleAlertIcon } from "lucide-preact";
import { AdmEntityDiscriminated, Fokontany } from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import SelectedAdmEntityItem from "@/components/shared/SelectedAdmEntityItem.tsx";
import {
  PINNED_LOCATION_ADM_TERRITORY_ERROR_MESSAGE_BY_CAUSE,
  PinnedLocationErrorCause,
} from "@/consts/pinned-locations.consts.ts";

export interface PinsPagePinnedLocationCardFokontanyProps {
  /** Whether the card is initially open or not. */
  defaultOpen?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Loading state of the fokontany */
  isLoading?: boolean;
  /** The fokontany of the pinned location. */
  fokontany?: Fokontany | null;
  /** The cause of the error of loading the fokontany of the pinned location. */
  errorCause?: PinnedLocationErrorCause | null;
}

export default function PinsPagePinnedLocationCardFokontany({
  defaultOpen = false,
  className = "",
  isLoading = false,
  fokontany,
  errorCause,
}: PinsPagePinnedLocationCardFokontanyProps) {
  const open = useSignal<boolean>(defaultOpen);

  const fokontanyDiscriminated = useMemo<AdmEntityDiscriminated | null>(() => {
    return fokontany
      ? { admLevelCode: AdmLevelCode.FOKONTANY, entity: fokontany }
      : null;
  }, [fokontany]);

  return (
    <div
      className={`rounded-lg border border-base-content/20 bg-white ${className}`}
    >
      <button
        type="button"
        aria-expanded={open.value}
        className="cursor-pointer flex w-full items-center justify-between gap-4 px-3 py-3 text-left font-medium text-base-content transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg"
        onClick={() => (open.value = !open.value)}
      >
        <div class="flex items-center gap-x-3">
          <span
            class="font-bold flex items-center gap-x-1.5"
            style="font-size: 0.8125rem"
          >
            <LandmarkIcon size={18} />
            ADM territory
          </span>
          {isLoading && (
            <span
              title="Resolving the ADM territory ..."
              class="loading loading-dots loading-sm text-base-content/60"
            >
            </span>
          )}
          {errorCause && (
            <TriangleAlertIcon
              size={16}
              class="text-error"
              title="Failed to resolve the ADM territory"
            />
          )}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform duration-300 ease-out ${
            open.value ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open.value ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-3 pb-4 pt-1">
            {!fokontany && isLoading && (
              <span class="flex items-center gap-x-2 text-xs text-base-content/60">
                <span class="loading loading-spinner loading-sm"></span>
                Resolving the ADM territory ...
              </span>
            )}
            {errorCause && (
              <div class="flex items-start gap-x-2 text-error">
                <TriangleAlertIcon size={14} class="shrink-0" />
                <p class="text-xs">
                  {PINNED_LOCATION_ADM_TERRITORY_ERROR_MESSAGE_BY_CAUSE.get(
                    errorCause,
                  )}
                </p>
              </div>
            )}
            {fokontanyDiscriminated && (
              <SelectedAdmEntityItem
                value={fokontanyDiscriminated}
                withParents
                unNestParents
                size="sm"
                closable={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
