import { ComponentChildren } from "preact";
import { storesContext, type StoresContextValue } from "./stores.context.ts";
import { injectAppMapStore } from "@/stores/app-map.store.ts";
import { injectPinnedLocationsStore } from "@/stores/pinned-locations.store.ts";
import { injectAdmGeojsonStore } from "@/stores/adm-geojson.store.ts";
import { injectApiStore } from "@/stores/api.store.ts";
import { injectAppLayoutStore } from "@/stores/app-layout.store.ts";
import { injectClientCacheIndexdDbConnection } from "@/client-cache/client-cache.indexeddb.ts";
import { injectAdmGeojsonClientCache } from "@/client-cache/adm-geojson.client-cache.ts";
import { injectProvinceApi } from "@/api/province.api.ts";
import { injectRegionApi } from "@/api/region.api.ts";
import { injectDistrictApi } from "@/api/district.api.ts";
import { injectCommuneApi } from "@/api/commune.api.ts";
import { injectFokontanyApi } from "@/api/fokontany.api.ts";

export type StoresProviderProps = {
  children?: ComponentChildren;
};

export function StoresProvider({ children }: StoresProviderProps) {
  function _injectAppMapStore() {
    return injectAppMapStore(
      injectAdmGeojsonClientCache(injectClientCacheIndexdDbConnection()),
      injectAdmGeojsonStore(),
      injectApiStore(),
      injectProvinceApi(),
      injectRegionApi(),
      injectDistrictApi(),
      injectCommuneApi(),
      injectFokontanyApi(),
    );
  }

  function _injectPinnedLocationsStore() {
    return injectPinnedLocationsStore(
      injectFokontanyApi(),
      injectApiStore(),
    );
  }

  const contextValue: StoresContextValue = {
    injectAdmGeojsonStore,
    injectApiStore,
    injectAppLayoutStore,
    injectAppMapStore: _injectAppMapStore,
    injectPinnedLocationsStore: _injectPinnedLocationsStore,
  };

  return (
    <storesContext.Provider value={contextValue}>
      {children}
    </storesContext.Provider>
  );
}
