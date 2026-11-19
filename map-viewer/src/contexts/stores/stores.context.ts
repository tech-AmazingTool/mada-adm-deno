import { createContext } from "preact";
import {
  type AdmGeoJsonStore,
  injectAdmGeojsonStore,
} from "@/stores/adm-geojson.store.ts";
import { type ApiStore, injectApiStore } from "@/stores/api.store.ts";
import {
  type AppLayoutStore,
  injectAppLayoutStore,
} from "@/stores/app-layout.store.ts";
import { type AppMapStore, injectAppMapStore } from "@/stores/app-map.store.ts";
import {
  injectPinnedLocationsStore,
  type PinnedLocationsStore,
} from "@/stores/pinned-locations.store.ts";
import { injectFokontanyApi } from "@/api/fokontany.api.ts";
import { injectAdmGeojsonClientCache } from "@/client-cache/adm-geojson.client-cache.ts";
import { injectClientCacheIndexdDbConnection } from "@/client-cache/client-cache.indexeddb.ts";
import { injectProvinceApi } from "@/api/province.api.ts";
import { injectRegionApi } from "@/api/region.api.ts";
import { injectDistrictApi } from "@/api/district.api.ts";
import { injectCommuneApi } from "@/api/commune.api.ts";

export type StoresContextValue = {
  injectAdmGeojsonStore: () => AdmGeoJsonStore;
  injectApiStore: () => ApiStore;
  injectAppLayoutStore: () => AppLayoutStore;
  injectAppMapStore: () => AppMapStore;
  injectPinnedLocationsStore: () => PinnedLocationsStore;
};

export const storesContext = createContext<StoresContextValue>({
  injectAdmGeojsonStore: () => injectAdmGeojsonStore(),
  injectApiStore: () => injectApiStore(),
  injectAppLayoutStore: () => injectAppLayoutStore(),
  injectPinnedLocationsStore: () =>
    injectPinnedLocationsStore(
      injectFokontanyApi(),
      injectApiStore(),
    ),
  injectAppMapStore: () =>
    injectAppMapStore(
      injectAdmGeojsonClientCache(injectClientCacheIndexdDbConnection()),
      injectAdmGeojsonStore(),
      injectApiStore(),
      injectProvinceApi(),
      injectRegionApi(),
      injectDistrictApi(),
      injectCommuneApi(),
      injectFokontanyApi(),
    ),
});
