import { MapPinPlusIcon } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Floating action button for pointing a pin on the map.
 *
 * When clicked, it activates point-on-map mode so the user can immediately
 * place a marker on the map. When point-on-map mode is already active,
 * clicking it cancels pointing.
 */
export default function AppMapPointOnMapFAB() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pointOnMapPayload } = pinnedLocationsStore;

  const isPointing = !!pointOnMapPayload.value;

  function handleFABClick() {
    if (isPointing) {
      pointOnMapPayload.value = null;
    } else {
      pointOnMapPayload.value = {};
    }
  }

  return (
    <div
      class="tooltip tooltip-left"
      data-tip={isPointing
        ? "Cancel map pin pointing"
        : "Point a pin on the map"}
    >
      <button
        type="button"
        class="btn btn-lg btn-circle shadow-sm"
        onClick={handleFABClick}
      >
        <MapPinPlusIcon
          size={20}
          stroke-width={2}
          class={isPointing ? "text-primary" : "text-current"}
        />
      </button>
    </div>
  );
}
