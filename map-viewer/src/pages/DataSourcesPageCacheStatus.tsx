import { useComputed } from "@preact/signals";
import { ADM_LEVEL_INDEX_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { CheckCircle, Download } from "lucide-preact";
import { pluralize } from "@scope/utils/string";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function DataSourcesPageCacheStatus() {
  const admGeoJsonStore = useStoresContext().injectAdmGeojsonStore();

  const canDownloadAll = useComputed(() => {
    if (!admGeoJsonStore.layersToDownload.value) return true;
    return admGeoJsonStore.downloads.value.length <
      (admGeoJsonStore.layersToDownload.value.cached.length +
        admGeoJsonStore.layersToDownload.value.nonCached.length);
  });

  async function handleDownloadAllClick() {
    if (!admGeoJsonStore.layersToDownload.value) return;
    const sortedAmdLevelsToDownload: AdmLevelCode[] = [
      ...admGeoJsonStore.layersToDownload.value.cached,
      ...admGeoJsonStore.layersToDownload.value.nonCached,
    ].sort((l1, l2) => {
      return ADM_LEVEL_INDEX_BY_CODE.get(l1)! -
        ADM_LEVEL_INDEX_BY_CODE.get(l2)!;
    });
    if (admGeoJsonStore.layersToDownload.value.nonCached.length > 0) {
      admGeoJsonStore.openDownloadModal(sortedAmdLevelsToDownload);
    } else {
      admGeoJsonStore.upsertAdmGeojsonDataDownloadsToast({
        type: "info",
        notification: "starting",
        admLevelCodes: sortedAmdLevelsToDownload,
      });
      await Promise.all(
        sortedAmdLevelsToDownload.map((l) =>
          admGeoJsonStore.downloadForAdmLevel(l)
        ),
      );
    }
  }

  return admGeoJsonStore.allLayersAreUpToDate.value
    ? (
      <div
        id="data-sources-pages-cache-status"
        role="alert"
        class="alert alert-success alert-soft"
      >
        <CheckCircle size={18} />
        <span>All the layers' caches are up to date.</span>
      </div>
    )
    : (admGeoJsonStore.layersToDownload.value && (
      <div
        id="data-sources-pages-cache-status"
        role="alert"
        class="alert alert-vertical sm:alert-horizontal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-info h-6 w-6 shrink-0"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          >
          </path>
        </svg>
        <div>
          <h6 class="font-bold mb-2">Layer(s) can be downloaded</h6>
          <div className="space-y-1">
            {admGeoJsonStore.layersToDownload.value.nonCached.length > 0 && (
              <div class="flex items-center gap-x-2">
                <span
                  class="inline-block bg-error"
                  style="width: 8px; height: 8px; border-radius: 50%;"
                >
                </span>
                <p class="text-xs font-semibold">
                  {admGeoJsonStore.layersToDownload.value.nonCached.length}{" "}
                  {pluralize(
                    "layer",
                    "+s",
                    admGeoJsonStore.layersToDownload.value.nonCached.length > 1,
                  )}{" "}
                  {admGeoJsonStore.layersToDownload.value.nonCached.length > 1
                    ? "are"
                    : "is"} not cached
                </p>
              </div>
            )}
            {admGeoJsonStore.layersToDownload.value.cached.length > 0 && (
              <div class="flex items-center gap-x-2">
                <span
                  class="inline-block bg-warning"
                  style="width: 8px; height: 8px; border-radius: 50%;"
                >
                </span>
                <p class="text-xs font-semibold">
                  {admGeoJsonStore.layersToDownload.value.cached.length}{" "}
                  {pluralize(
                    "layer",
                    "+s",
                    admGeoJsonStore.layersToDownload.value.cached.length > 1,
                  )} {admGeoJsonStore.layersToDownload.value.cached.length > 1
                    ? "are"
                    : "is"} out-of-date
                </p>
              </div>
            )}
          </div>
          {canDownloadAll.value && (
            <button
              type="button"
              class="btn btn-sm btn-outline btn-primary mt-3"
              onClick={handleDownloadAllClick}
            >
              <Download size={16} />
              <span>Download all</span>
            </button>
          )}
        </div>
      </div>
    ));
}
