import { useEffect } from "preact/hooks";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";

export type AppMapPinnedLocationBeaconAdmTerritoryDivisionProps = {
  division: AdmEntityDivisionWithEntry;
};

export default function AppMapPinnedLocationBeaconAdmTerritoryDivision(
  { division }: AppMapPinnedLocationBeaconAdmTerritoryDivisionProps,
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
      if (updatedEntry && updatedEntry.refsCount === 1) {
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
