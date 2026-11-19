import { useEffect, useRef } from "preact/hooks";
import { useComputed, useSignalEffect } from "@preact/signals";
import { Download } from "lucide-preact";
import { pluralize } from "@scope/utils/string";
import { useStoresContext } from "@/contexts/stores/index.ts";

import { ADM_LEVEL_TITLE_BY_CODE } from "@scope/consts/models";

export default function AppMapAdmGeoJsonDownloadModal() {
  const admGeoJsonStore = useStoresContext().injectAdmGeojsonStore();

  const dialogRef = useRef<HTMLDialogElement>(
    null,
  );

  const layerTextWithPlural = useComputed(() => {
    return pluralize(
      "layer",
      "+s",
      admGeoJsonStore.admLevelCodesToBeDownloaded.value.length > 1,
    );
  });

  const totalFileSize = useComputed(() => {
    return admGeoJsonStore.fileSizes.value.reduce(
      (acc, curr) => curr.fileSize ? (acc += curr.fileSize) : acc,
      0,
    );
  });

  useSignalEffect(() => {
    if (admGeoJsonStore.downloadModalIsOpen.value) {
      dialogRef.current?.showModal();
    }
  });

  useEffect(() => {
    dialogRef.current?.addEventListener(
      "close",
      () => {
        const returnValue = dialogRef.current?.returnValue;
        if (returnValue === "download") {
          admGeoJsonStore.upsertAdmGeojsonDataDownloadsToast({
            type: "info",
            notification: "starting",
            admLevelCodes: admGeoJsonStore.admLevelCodesToBeDownloaded.value,
          });
          for (
            const admLevelCode of admGeoJsonStore.admLevelCodesToBeDownloaded
              .value
          ) {
            admGeoJsonStore.downloadForAdmLevel(admLevelCode);
          }
        }
        admGeoJsonStore.closeDownloadModal();
      },
    );
  }, []);

  return (
    <dialog ref={dialogRef} class="modal">
      <div class="modal-box w-11/12 md:w-8/12 lg:w-7/12 max-w-5xl">
        <h3 class="text-lg font-bold flex items-center gap-x-3 mb-4">
          <Download />{" "}
          <span>Download & Cache the ADM {layerTextWithPlural}</span>
        </h3>
        {admGeoJsonStore.fileSizes.value.length > 0 && (
          <div class="space-y-2">
            <p class="text-base-content/80 text-sm">
              {admGeoJsonStore.fileSizes.value.length} {layerTextWithPlural}
              {" "}
              selected
              <span class="mx-2">·</span>
              {(totalFileSize.value / 1024 ** 2).toFixed(1)} MB total
            </p>
            <div class="overflow-x-auto mb-4">
              <table class="table">
                <thead>
                  <tr>
                    <th>Layer</th>
                    <th>Source file</th>
                    <th class="text-right">File size</th>
                  </tr>
                </thead>
                <tbody>
                  {admGeoJsonStore.fileSizes.value.map((item) => {
                    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(
                      item.admLevelCode,
                    )!;
                    const fileName = item.previewURL.split("/").pop()!;
                    const fileSize = item.fileSize
                      ? `${(item.fileSize / 1024 ** 2).toFixed(1)} MB`
                      : "-";
                    return (
                      <tr class="hover:bg-base-content/10">
                        <td>
                          {item.admLevelCode}:{" "}
                          <span className="capitalize">{admLevelTitle}</span>
                        </td>
                        <td>
                          <a
                            href={item.previewURL}
                            target="_blank"
                            rel="noreferrer"
                            class="link link-primary"
                          >
                            {fileName}
                          </a>
                        </td>
                        <td class="text-right">
                          {fileSize}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div role="alert" class="alert alert-info mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="h-6 w-6 shrink-0 stroke-current"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                >
                </path>
              </svg>
              <span>
                Layers will be cached locally for offline use. When updates are
                available on the server, you can download those updated layers
                as you wish.
              </span>
            </div>
            <form method="dialog">
              <div class="flex justify-end gap-x-2 items-center">
                <button type="submit" value="close" class="btn">
                  Close
                </button>
                <button type="submit" value="download" class="btn btn-primary">
                  <Download size={18} />
                  Download
                  {admGeoJsonStore.fileSizes.value.length > 1 &&
                    " all"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" value="close">close</button>
      </form>
    </dialog>
  );
}
