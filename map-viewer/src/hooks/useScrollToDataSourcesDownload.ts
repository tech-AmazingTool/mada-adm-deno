import { useEffect } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { useStoresContext } from "@/contexts/stores/index.ts";

import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";

export default function useScrollToDataSourcesDownload() {
  const admGeoJsonStore = useStoresContext().injectAdmGeojsonStore();

  useEffect(() => {
    function handleNavigate(e: NavigateEvent) {
      if (admGeoJsonStore.cachedMetadataIsLoaded.value) {
        const url = new URL(e.destination.url);
        if (url.pathname.startsWith("/data-sources")) {
          scrollToDataSourcesDownloadFromURL(url);
        }
      }
    }

    navigation.addEventListener("navigate", handleNavigate);

    return () => {
      navigation.removeEventListener("navigate", handleNavigate);
    };
  }, []);

  useSignalEffect(() => {
    if (admGeoJsonStore.cachedMetadataIsLoaded.value) {
      const url = new URL(location.href);
      scrollToDataSourcesDownloadFromURL(url);
    }
  });

  function scrollToDataSourcesDownloadFromURL(url: URL) {
    if (
      url.pathname.startsWith("/data-sources") &&
      url.searchParams.has("layer")
    ) {
      const layer = url.searchParams.get("layer")!;
      let admLevelCode: AdmLevelCode | null = null;
      if (layer === "first-in-downloads") {
        const sortedDownloads = admGeoJsonStore.downloads.value.sort(
          (a, b) => {
            return a.admLevelCode.localeCompare(b.admLevelCode);
          },
        );
        if (sortedDownloads[0]) {
          admLevelCode = sortedDownloads[0].admLevelCode;
        }
      } else if (layer === "first-updatable") {
        const firstUpdatableCachedMetadata = admGeoJsonStore.cachedMetadata
          .value.find((m) => {
            return m.version <
              admGeoJsonStore.admGeoJsonDataVersionByCode.value?.get(
                m.admLevelCode,
              )!;
          });
        if (firstUpdatableCachedMetadata) {
          admLevelCode = firstUpdatableCachedMetadata.admLevelCode;
        }
      } else if (ADM_LEVEL_CODES_INDEXED.includes(layer as AdmLevelCode)) {
        admLevelCode = layer as AdmLevelCode;
      }
      if (admLevelCode) {
        document.querySelector(`[data-adm-geojson-download="${admLevelCode}"]`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
      history.replaceState(
        null,
        "",
        url.pathname,
      );
    }
  }
}
