import AppMapTrackCurrentLocationFAB from "@/components/shell/AppMapTrackCurrentLocationFAB.tsx";
import AppMapPointOnMapFAB from "@/components/shell/AppMapPointOnMapFAB.tsx";
import AppMapManualCoordinatesEntryFAB from "@/components/shell/AppMapManualCoordinatesEntryFAB.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function AppMapPinLocationActions() {
  const appMapStore = useStoresContext().injectAppMapStore();
  const { mapIsLoaded } = appMapStore;

  return mapIsLoaded.value && (
    <aside
      id="app-map-pin-location-actions"
      class="fixed top-4 right-2 flex flex-col gap-y-2.5"
      style="z-index: calc(var(--base-z-index) + 10)"
    >
      <AppMapTrackCurrentLocationFAB />
      <AppMapPointOnMapFAB />
      <AppMapManualCoordinatesEntryFAB />
    </aside>
  );
}
