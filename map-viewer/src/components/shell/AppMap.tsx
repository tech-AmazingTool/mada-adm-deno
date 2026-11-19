import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "preact/hooks";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { useWalkthroughDriverContext } from "@/contexts/walkthrough-driver/index.ts";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";
import {
  INITIAL_MAP_CENTER,
  INITIAL_ZOOM,
  MAX_ZOOM,
  OFM_TILE_LAYER_STYLE_URL,
} from "@/consts/map.consts.ts";
import { injectClientCacheIndexdDbConnection } from "@/client-cache/client-cache.indexeddb.ts";
import { injectAdmGeojsonClientCache } from "@/client-cache/adm-geojson.client-cache.ts";
import AppMapAdmGeoJsonDownloadModal from "@/components/shell/AppMapAdmGeoJsonDownloadModal.tsx";
import { AdmGeojsonMetadataClientCacheItem } from "@/types/cache.d.ts";
import { LayerSwitcherControl } from "@/helpers/map-layer-switch-control.helper.ts";
import { injectAdmEntityApi } from "@/api/adm-entity.api.ts";
import AppMapDynamicAdmGeoJsonLayer from "@/components/shell/AppMapDynamicAdmGeoJsonLayer.tsx";
import { UNREFERENCED_ADM_GEOJSON_CLEANUP_INTERVAL } from "@/config/adm-entities.config.ts";
import AppMapCurrentLocationBeacon from "@/components/shell/AppMapCurrentLocationBeacon.tsx";
import AppMapPinnedLocations from "@/components/shell/AppMapPinnedLocations.tsx";
import AppMapPinLocationActions from "@/components/shell/AppMapPinLocationActions.tsx";

export type AppMapProps = {
  admGeojsonDataVersionByCode: Map<AdmLevelCode, number>;
};

export default function AppMap(props: AppMapProps) {
  const indexedDb = injectClientCacheIndexdDbConnection();
  const admGeoJsonClientCache = injectAdmGeojsonClientCache(indexedDb);

  const {
    injectApiStore,
    injectAppMapStore,
    injectAdmGeojsonStore,
    injectAppLayoutStore,
  } = useStoresContext();

  const admGeoJsonStore = injectAdmGeojsonStore();

  useEffect(() => {
    syncExistingAdmGeoJsonData();
  }, []);

  async function syncExistingAdmGeoJsonData() {
    admGeoJsonStore.admGeoJsonDataVersionByCode.value =
      props.admGeojsonDataVersionByCode;

    const admGeoJsonMetadata = await admGeoJsonClientCache.getAllMetadata();

    admGeoJsonStore.cachedMetadata.value = admGeoJsonMetadata;
    admGeoJsonStore.cachedMetadataIsLoaded.value = true;

    const updatableCachedMetadata = admGeoJsonStore.cachedMetadata
      .value.filter((m) => {
        return m.version <
          props.admGeojsonDataVersionByCode.get(
            m.admLevelCode,
          )!;
      });
    if (updatableCachedMetadata.length > 0) {
      admGeoJsonStore.upsertAdmGeojsonDataDownloadsToast({
        type: "warning",
        notification: "updates-available",
        admLevelCodes: updatableCachedMetadata.map((m) => m.admLevelCode),
      });
    }
  }

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const apiStore = injectApiStore();

  const appMapStore = injectAppMapStore();

  const mapRef = useRef<maplibregl.Map>();
  const mapLayerSwitcherControlRef = useRef<LayerSwitcherControl>();
  const mapIsLoaded = useSignal(false);

  const prevCursorRef = useRef<string>("grab");

  useEffect(() => {
    const map = new maplibregl.Map({
      style: OFM_TILE_LAYER_STYLE_URL,
      center: INITIAL_MAP_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: MAX_ZOOM,
      container: mapContainerRef.current!,
    });
    appMapStore.map.value = map;

    const layerSwitcher = new LayerSwitcherControl(map, {
      onAdmGeoJsonLayerCheckoxChange: handleAdmGeoJsonLayerCheckoxChange,
      admGeoJsonLayersCheckboxesStates:
        appMapStore.admGeoJsonLayersCheckboxesStates,
    });
    mapLayerSwitcherControlRef.current = layerSwitcher;
    appMapStore.mapLayerSwitcherControl.value = layerSwitcher;
    map.addControl(layerSwitcher, "bottom-left");

    const zoomControl = new maplibregl.NavigationControl({
      showZoom: true,
      showCompass: true,
    });
    map.addControl(zoomControl, "bottom-right");

    mapRef.current = map;
    map.on("load", () => {
      mapIsLoaded.value = true;
      appMapStore.mapIsLoaded.value = true;
    });

    function handleMapMouseDown() {
      const cursor = getComputedStyle(map.getCanvas()).cursor!
        .toString();
      if (cursor !== "grabbing") prevCursorRef.current = cursor;
      map.getCanvas().style.cursor = "grabbing";
    }
    map.on("mousedown", handleMapMouseDown);

    function handleMapMouseUp() {
      map.getCanvas().style.cursor = prevCursorRef.current;
    }
    map.on("mouseup", handleMapMouseUp);

    return () => {
      map.off("mousedown", handleMapMouseDown);
      map.off("mouseup", handleMapMouseUp);

      layerSwitcher.onRemove();
      map.remove();
    };
  }, []);

  async function handleAdmGeoJsonLayerCheckoxChange(
    admLevelCode: AdmLevelCode,
    checked: boolean,
  ) {
    const checkboxState = appMapStore.admGeoJsonLayersCheckboxesStates.value
      .find(
        (d) => d.code === admLevelCode,
      );
    if (checkboxState && checkboxState.checked === "loading") return;
    if (!checked) {
      appMapStore.checkAdmGeoJsonLayer(admLevelCode, false);
      if (
        mapLayerSwitcherControlRef.current?.hasStaticAdmGeoJsonLayer(
          admLevelCode,
        )
      ) {
        mapLayerSwitcherControlRef.current?.removeStaticAdmGeoJsonLayer(
          admLevelCode,
        );
      }
      return;
    }
    await appMapStore.enableAdmGeoJsonLayer(admLevelCode);
  }

  useSignalEffect(() => {
    if (!admGeoJsonStore.downloadModalIsOpen.value) {
      for (
        const checkboxState of appMapStore.admGeoJsonLayersCheckboxesStates
          .value
      ) {
        if (checkboxState.checked === true) {
          if (
            !admGeoJsonStore.cachedMetadataCodes.value.has(checkboxState.code)
          ) {
            if (
              !admGeoJsonStore.downloadByAdmLevelCode.value.has(
                checkboxState.code,
              )
            ) {
              appMapStore.checkAdmGeoJsonLayer(checkboxState.code, false);
            } else if (
              ["idle", "downloading"].includes(
                admGeoJsonStore.downloadByAdmLevelCode.value.get(
                  checkboxState.code,
                )!.status,
              )
            ) {
              appMapStore.checkAdmGeoJsonLayer(checkboxState.code, "loading");
            }
          }
        }
      }
    }
  });

  useSignalEffect(() => {
    handleAdmGeoJsonDownloadsResolved();
  });

  async function handleAdmGeoJsonDownloadsResolved() {
    for (const download of admGeoJsonStore.downloads.value) {
      if (download.status !== "success" && download.status !== "failed") {
        continue;
      }
      if (download.status === "success" && !download.geojson) continue;
      const checkboxState = appMapStore.admGeoJsonLayersCheckboxesStates.value
        .find(
          (d) => d.code === download.admLevelCode,
        )!;
      if (download.status === "failed") {
        if (checkboxState.checked === "loading") {
          appMapStore.checkAdmGeoJsonLayer(checkboxState.code, false);
        }
        continue;
      }
      const cachedMetadata = admGeoJsonStore.cachedMetadata.value.find(
        (metadata) => metadata.admLevelCode === download.admLevelCode,
      );
      const metadata: AdmGeojsonMetadataClientCacheItem = {
        admLevelCode: download.admLevelCode,
        version: props.admGeojsonDataVersionByCode.get(
          download.admLevelCode,
        )!,
        lastModified: new Date(),
      };
      await admGeoJsonClientCache.upsert({
        ...metadata,
        geojson: download.geojson!,
      });
      admGeoJsonStore.upsertCachedMetadata(metadata);
      if (!cachedMetadata) {
        appMapStore.checkAdmGeoJsonLayer(download.admLevelCode, true);
        await mapLayerSwitcherControlRef.current?.addStaticAdmGeoJsonLayer(
          download.admLevelCode,
          download.geojson!,
        );
      } else if (
        mapLayerSwitcherControlRef.current?.hasStaticAdmGeoJsonLayer(
          download.admLevelCode,
        ) && download.geojson
      ) {
        mapLayerSwitcherControlRef.current?.removeStaticAdmGeoJsonLayer(
          download.admLevelCode,
        );
        await mapLayerSwitcherControlRef.current?.addStaticAdmGeoJsonLayer(
          download.admLevelCode,
          download.geojson,
        );
      }
      delete download.geojson; // Free the reference to the geojson data from memory
    }
  }

  const admEntityApi = injectAdmEntityApi();

  useEffect(() => {
    admEntityApi.getAllInBatch()
      .then((batch) => {
        const [adm0, adm1, adm2, adm3, adm4] = batch;
        apiStore.provinces.value = adm0.provinces;
        apiStore.regions.value = adm1.regions;
        apiStore.districtsAreLoaded.value = true;
        apiStore.districts.value = adm2.paginatedDistricts.records;
        apiStore.districtsNextCursor.value =
          adm2.paginatedDistricts.nextEncoded ?? null;
        apiStore.communesAreLoaded.value = true;
        apiStore.communes.value = adm3.paginatedCommunes.records;
        apiStore.communesNextCursor.value =
          adm3.paginatedCommunes.nextEncoded ?? null;
        apiStore.fokontanysAreLoaded.value = true;
        apiStore.fokontanys.value = adm4.paginatedFokontanys.records;
        apiStore.fokontanysNextCursor.value =
          adm4.paginatedFokontanys.nextEncoded ?? null;
        apiStore.initialAdmEntitiesAreLoaded.value = true;
      })
      .catch((e) => console.error(e));
  }, []);

  const renderedProviceGeoJsonEntries = useComputed(() => {
    return appMapStore.provincesGeoJsonEntries.value
      .filter((e) => e.isRendered);
  });
  const renderedRegionGeoJsonEntries = useComputed(() => {
    return appMapStore.regionsGeoJsonEntries.value
      .filter((e) => e.isRendered);
  });
  const renderedDistrictGeoJsonEntries = useComputed(() => {
    return appMapStore.districtsGeoJsonEntries.value
      .filter((e) => e.isRendered);
  });
  const renderedCommuneGeoJsonEntries = useComputed(() => {
    return appMapStore.communesGeoJsonEntries.value
      .filter((e) => e.isRendered);
  });
  const renderedFokontanyGeoJsonEntries = useComputed(() => {
    return appMapStore.fokontanysGeoJsonEntries.value
      .filter((e) => e.isRendered);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      for (const admLevelCode of ADM_LEVEL_CODES_INDEXED) {
        appMapStore.removeNonReferencedAdmEntityGeoJsonEntries(admLevelCode);
      }
    }, UNREFERENCED_ADM_GEOJSON_CLEANUP_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, []);

  const appLayoutStore = injectAppLayoutStore();

  const { getLastWalkThroughStep, injectWalkThroughDriver } =
    useWalkthroughDriverContext();

  useEffect(() => {
    if (!mapIsLoaded.value) return;

    const lastStep = getLastWalkThroughStep();
    if (
      lastStep !== null && [0, 1, 2, 3, 6, 9, 10, 13, 14].includes(lastStep)
    ) {
      const driver = injectWalkThroughDriver();

      if ([1, 13].includes(lastStep)) {
        const drawerElt = document.getElementById(
          "router-pages-drawer",
        )!;

        // deno-lint-ignore no-inner-declarations
        function handleWaitDrawerToggled() {
          if (!appLayoutStore.sidebarIsOpen.value) {
            driver.drive(lastStep!);
            drawerElt.removeEventListener(
              "transitionend",
              handleWaitDrawerToggled,
            );
          }
        }

        drawerElt.addEventListener("transitionend", handleWaitDrawerToggled);
        appLayoutStore.toggleSidebar(false);
      } else {
        driver.drive(lastStep);
      }
    }
  }, [mapIsLoaded.value]);

  return (
    <>
      {/* Map container */}
      <div
        ref={mapContainerRef}
        id="app-map-map-container"
        class="h-full w-full"
      >
      </div>
      {/* Confirm ADM GeoJSON data download modal */}
      <AppMapAdmGeoJsonDownloadModal />
      {/* Dynamic ADM GeoJSON layers */}
      {appMapStore.map.value && (
        <>
          {renderedProviceGeoJsonEntries.value.map((entry) => {
            const key = `${AdmLevelCode.PROVINCE}-${entry.name}`;
            return (
              <AppMapDynamicAdmGeoJsonLayer
                key={key}
                map={appMapStore.map.value!}
                admGeoJsonEntry={entry}
              />
            );
          })}
          {renderedRegionGeoJsonEntries.value.map((entry) => {
            const key = `${AdmLevelCode.REGION}-${entry.name}`;
            return (
              <AppMapDynamicAdmGeoJsonLayer
                key={key}
                map={appMapStore.map.value!}
                admGeoJsonEntry={entry}
              />
            );
          })}
          {renderedDistrictGeoJsonEntries.value.map((entry) => {
            const key = `${AdmLevelCode.DISTRICT}-${entry.name}`;
            return (
              <AppMapDynamicAdmGeoJsonLayer
                key={key}
                map={appMapStore.map.value!}
                admGeoJsonEntry={entry}
              />
            );
          })}
          {renderedCommuneGeoJsonEntries.value.map((entry) => {
            const key = `${AdmLevelCode.COMMUNE}-${entry.name}`;
            return (
              <AppMapDynamicAdmGeoJsonLayer
                key={key}
                map={appMapStore.map.value!}
                admGeoJsonEntry={entry}
              />
            );
          })}
          {renderedFokontanyGeoJsonEntries.value.map((entry) => {
            const key = `${AdmLevelCode.FOKONTANY}-${entry.name}`;
            return (
              <AppMapDynamicAdmGeoJsonLayer
                key={key}
                map={appMapStore.map.value!}
                admGeoJsonEntry={entry}
              />
            );
          })}
        </>
      )}
      {/* Pinned locations markers */}
      {mapIsLoaded.value && mapRef.current && (
        <>
          <AppMapCurrentLocationBeacon map={mapRef.current} />
          <AppMapPinnedLocations map={mapRef.current} />
        </>
      )}
      {/* Pin location actions FABs */}
      <AppMapPinLocationActions />
    </>
  );
}
