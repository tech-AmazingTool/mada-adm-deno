import { MapPinPlusIcon } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Action within the pin location modal that redirects the user
 * to dropping a pin directly on the map.
 */
export default function PinsPagePinLocationModalPointOnMapForm() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pointOnMapPayload, showPanel } = pinnedLocationsStore;

  function handleAddPin() {
    pointOnMapPayload.value = {};
    showPanel.value = false;
  }

  return (
    <div class="flex gap-x-3">
      <button
        type="button"
        class="btn btn-primary"
        onClick={handleAddPin}
      >
        <MapPinPlusIcon size={16} />
        <span>Add pin</span>
      </button>
    </div>
  );
}
