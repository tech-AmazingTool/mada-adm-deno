import { useStoresContext } from "@/contexts/stores/index.ts";
import { PinIcon } from "lucide-preact";

export default function PinsPageCtaBtn() {
  const { showPanel } = useStoresContext().injectPinnedLocationsStore();

  return (
    <>
      <button
        type="button"
        id="pins-page-cta-btn"
        class="btn btn-primary flex items-center"
        onClick={() => showPanel.value = true}
      >
        <PinIcon size={16} />
        <span>Pin a location to the map</span>
      </button>
    </>
  );
}
