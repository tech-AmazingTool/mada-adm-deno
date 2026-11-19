import { useEffect } from "preact/hooks";
import { type AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";

export type AppMapDynamicAdmGeoJsonLayerDivisionProps = {
  isRootEntry: boolean;
  division: AdmEntityDivisionWithEntry;
};

export default function AppMapDynamicAdmGeoJsonLayerDivision(
  { division, isRootEntry }: AppMapDynamicAdmGeoJsonLayerDivisionProps,
) {
  const appMapStore = useStoresContext().injectAppMapStore();

  useEffect(() => {
    appMapStore.referenceAdmEntityGeoJsonEntryByName(
      division.admLevelCode,
      division.name,
      true,
    );
    return () => {
      const updatedEntry = appMapStore.referenceAdmEntityGeoJsonEntryByName(
        division.admLevelCode,
        division.name,
        false,
      );
      const minRefsCount = isRootEntry ? 0 : 1;
      if (updatedEntry && updatedEntry.refsCount <= minRefsCount) {
        appMapStore.renderAdmEntityGeoJsonEntryByName(
          updatedEntry.admEntityDiscriminated!.admLevelCode,
          updatedEntry.name,
          false,
        );
      }
    };
  }, []);

  return null;
}
