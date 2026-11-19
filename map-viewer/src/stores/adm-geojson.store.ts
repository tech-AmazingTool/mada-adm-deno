import { computed, signal } from "@preact/signals";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";
import { ADM_GEOJSON_DATA_SOURCE_BY_CODE } from "@/consts/adm-geojson.consts.ts";
import { GeoJSONFeature, GeoJSONFeatureCollection } from "@scope/types/utils";
import type { GetAdmGeojsonFileSizeResponseItem } from "@/types/api.d.ts";
import type { AdmGeojsonMetadataClientCacheItem } from "@/types/cache.d.ts";
import { REST_API_BASE_URL } from "@/config/rest-api.config.ts";

export type AdmGeojsonDataDownloadItem = {
  admLevelCode: AdmLevelCode;
  downloaded: number;
  status: "idle" | "downloading" | "success" | "failed";
  total?: number;
  geojson?: GeoJSONFeatureCollection<Record<string, unknown>>;
};

export type AdmGeojsonDataDownloadsToastItem =
  & { type: "warning" | "success" | "error" | "info" }
  & (
    | {
      notification: "starting";
      admLevelCodes: AdmLevelCode[];
    }
    | {
      notification: "updates-available";
      admLevelCodes: AdmLevelCode[];
    }
    | { notification: "success"; admLevelCode: AdmLevelCode }
    | { notification: "error"; admLevelCode: AdmLevelCode }
  );

export class AdmGeoJsonStore {
  readonly admGeoJsonDataVersionByCode = signal<Map<AdmLevelCode, number>>();

  readonly downloads = signal<AdmGeojsonDataDownloadItem[]>([]);

  readonly downloadByAdmLevelCode = computed<
    Map<AdmLevelCode, AdmGeojsonDataDownloadItem>
  >(() => {
    return new Map(this.downloads.value.map((d) => [d.admLevelCode, d]));
  });

  private upsertDownload(download: AdmGeojsonDataDownloadItem) {
    const i = this.downloads.value.findIndex(
      (d) => d.admLevelCode === download.admLevelCode,
    );
    if (i === -1) {
      this.downloads.value = [...this.downloads.value, download];
    } else {
      const downloads = [...this.downloads.value];
      downloads[i] = download;
      this.downloads.value = downloads;
    }
  }

  async downloadForAdmLevel(
    admLevelCode: AdmLevelCode,
  ): Promise<GeoJSONFeatureCollection<Record<string, unknown>>> {
    const { isNDJSON } = ADM_GEOJSON_DATA_SOURCE_BY_CODE.get(admLevelCode)!;

    const download: AdmGeojsonDataDownloadItem = {
      admLevelCode,
      downloaded: 0,
      status: "idle",
    };
    this.upsertDownload(download);

    try {
      const url = `${REST_API_BASE_URL}/download/adm-geojson/${admLevelCode}`;
      const response = await fetch(url);
      download.status = "downloading";

      const contentLengthHeader = response.headers.get("Content-Length");
      if (contentLengthHeader) {
        const fileSize = Number(contentLengthHeader);
        download.total = fileSize;
      }
      this.upsertDownload({ ...download });

      let geojsonFeatureCollection!: GeoJSONFeatureCollection<
        Record<string, unknown>
      >;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader for the response");
      }

      const geojsonFeatures: GeoJSONFeature<Record<string, unknown>>[] = [];
      const textDecoder = new TextDecoder();
      let buffer = "";

      let downloadThottlingTimeout: ReturnType<typeof setTimeout> | null = null;
      const downloadThottlingTimeoutDuration = 250;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        download.downloaded += value.length;

        if (!downloadThottlingTimeout) {
          this.upsertDownload({ ...download });
          downloadThottlingTimeout = setTimeout(() => {
            this.upsertDownload({ ...download });
            downloadThottlingTimeout = null;
          }, downloadThottlingTimeoutDuration);
        }

        const chunkText = textDecoder.decode(value, { stream: true });
        if (isNDJSON) {
          const lines = (buffer + chunkText).split("\n").filter((line) =>
            !!line
          );
          buffer = lines.pop() ?? "";
          geojsonFeatures.push(
            ...lines.map((line) =>
              JSON.parse(line) as GeoJSONFeature<Record<string, unknown>>
            ),
          );
        } else {
          buffer += chunkText;
        }
      }

      if (downloadThottlingTimeout) {
        clearTimeout(downloadThottlingTimeout);
      }

      if (isNDJSON) {
        geojsonFeatures.push(
          JSON.parse(buffer) as GeoJSONFeature<Record<string, unknown>>,
        );
        geojsonFeatureCollection = {
          type: "FeatureCollection",
          features: geojsonFeatures,
        };
      } else {
        geojsonFeatureCollection = JSON.parse(
          buffer,
        ) as GeoJSONFeatureCollection<Record<string, unknown>>;
      }

      download.status = "success";
      this.upsertDownload({ ...download, geojson: geojsonFeatureCollection });
      this.upsertAdmGeojsonDataDownloadsToast({
        type: "success",
        notification: "success",
        admLevelCode: download.admLevelCode,
      });

      return geojsonFeatureCollection;
    } catch (error) {
      download.status = "failed";
      this.upsertDownload({ ...download });
      this.upsertAdmGeojsonDataDownloadsToast({
        type: "error",
        notification: "error",
        admLevelCode: download.admLevelCode,
      });
      throw error;
    }
  }

  removeAdmLevelDownload(admLevelCode: AdmLevelCode) {
    this.downloads.value = this.downloads.value.filter(
      (d) => d.admLevelCode !== admLevelCode,
    );
  }

  readonly downloadModalIsOpen = signal(false);
  readonly admLevelCodesToBeDownloaded = signal<AdmLevelCode[]>([]);
  readonly fileSizes = signal<GetAdmGeojsonFileSizeResponseItem[]>([]);

  openDownloadModal(admLevelCodes?: AdmLevelCode[]) {
    this.downloadModalIsOpen.value = true;
    this.fileSizes.value = [];
    admLevelCodes && (this.admLevelCodesToBeDownloaded.value = admLevelCodes);

    const fileSizesByAdmLevelCode: GetAdmGeojsonFileSizeResponseItem[] = [];
    for (const source of this.admLevelCodesToBeDownloaded.value) {
      const sourceData = ADM_GEOJSON_DATA_SOURCE_BY_CODE.get(source)!;
      fileSizesByAdmLevelCode.push({
        admLevelCode: source,
        rawURL: sourceData.rawURL,
        previewURL: sourceData.previewURL,
        fileSize: sourceData.fileSize,
      });
    }
    this.fileSizes.value = fileSizesByAdmLevelCode;
  }

  closeDownloadModal() {
    this.downloadModalIsOpen.value = false;
    this.fileSizes.value = [];
    this.admLevelCodesToBeDownloaded.value = [];
  }

  readonly cachedMetadata = signal<AdmGeojsonMetadataClientCacheItem[]>([]);
  readonly cachedMetadataIsLoaded = signal(false);

  readonly allLayersAreUpToDate = computed(() => {
    if (
      !this.cachedMetadataIsLoaded.value ||
      !this.admGeoJsonDataVersionByCode.value
    ) return false;
    return ADM_LEVEL_CODES_INDEXED.every((admLevelCode) => {
      const cachedMetadata = this.cachedMetadata.value.find((m) =>
        m.admLevelCode === admLevelCode
      );
      return cachedMetadata && cachedMetadata.version >=
          this.admGeoJsonDataVersionByCode.value!.get(admLevelCode)!;
    });
  });

  readonly layersToDownload = computed<
    Record<"nonCached" | "cached", AdmLevelCode[]> | null
  >(() => {
    if (
      !this.cachedMetadataIsLoaded.value ||
      !this.admGeoJsonDataVersionByCode.value
    ) return null;
    if (this.allLayersAreUpToDate.value) return null;
    const nonCached: AdmLevelCode[] = [];
    const cached: AdmLevelCode[] = [];
    for (const admLevelCode of ADM_LEVEL_CODES_INDEXED) {
      const cachedMetadata = this.cachedMetadata.value.find((m) =>
        m.admLevelCode === admLevelCode
      );
      if (!cachedMetadata) nonCached.push(admLevelCode);
      else if (
        cachedMetadata.version <
          this.admGeoJsonDataVersionByCode.value.get(admLevelCode)!
      ) cached.push(admLevelCode);
    }
    if (nonCached.length === 0 && cached.length === 0) return null;
    return { cached, nonCached };
  });

  cachedMetadataCodes = computed<Set<AdmLevelCode>>(() => {
    return new Set(
      this.cachedMetadata.value.map((d) => d.admLevelCode),
    );
  });

  upsertCachedMetadata(metadata: AdmGeojsonMetadataClientCacheItem) {
    const i = this.cachedMetadata.value.findIndex(
      (d) => d.admLevelCode === metadata.admLevelCode,
    );
    if (i === -1) {
      this.cachedMetadata.value = [...this.cachedMetadata.value, metadata];
    } else {
      this.cachedMetadata.value[i] = metadata;
      this.cachedMetadata.value = [...this.cachedMetadata.value];
    }
  }

  private readonly admGeoJsonDataDownloadsToastsWithTimeouts = signal<
    [AdmGeojsonDataDownloadsToastItem, ReturnType<typeof setTimeout>][]
  >([]);

  readonly admGeoJsonDataDownloadsToasts = computed<
    AdmGeojsonDataDownloadsToastItem[]
  >(() => {
    return this.admGeoJsonDataDownloadsToastsWithTimeouts.value.map(
      (d) => d[0],
    );
  });

  upsertAdmGeojsonDataDownloadsToast(toast: AdmGeojsonDataDownloadsToastItem) {
    const existingToastData = this.admGeoJsonDataDownloadsToastsWithTimeouts
      .value.find(
        (d) => {
          if (
            toast.notification === "starting" ||
            toast.notification === "updates-available"
          ) {
            return d[0].notification === toast.notification;
          } else {
            return d[0].notification === toast.notification &&
              d[0].admLevelCode === toast.admLevelCode;
          }
        },
      );
    if (existingToastData) {
      this.removeAdmGeojsonDataDownloadsToast(
        toast,
      );
    }
    const closeTimeout = setTimeout(() => {
      this.removeAdmGeojsonDataDownloadsToast(
        toast,
      );
    }, 5000);
    this.admGeoJsonDataDownloadsToastsWithTimeouts.value = [
      ...this.admGeoJsonDataDownloadsToastsWithTimeouts.value,
      [toast, closeTimeout],
    ];
  }

  removeAdmGeojsonDataDownloadsToast(toast: AdmGeojsonDataDownloadsToastItem) {
    const toastDataIndex = this.admGeoJsonDataDownloadsToastsWithTimeouts.value
      .findIndex(
        (d) => {
          if (
            toast.notification === "starting" ||
            toast.notification === "updates-available"
          ) {
            return d[0].notification === toast.notification;
          } else {
            return d[0].notification === toast.notification &&
              d[0].admLevelCode === toast.admLevelCode;
          }
        },
      );
    if (toastDataIndex >= 0) {
      clearTimeout(
        this.admGeoJsonDataDownloadsToastsWithTimeouts.value[toastDataIndex][1],
      );
      this.admGeoJsonDataDownloadsToastsWithTimeouts.value.splice(
        toastDataIndex,
        1,
      );
      this.admGeoJsonDataDownloadsToastsWithTimeouts.value = [
        ...this.admGeoJsonDataDownloadsToastsWithTimeouts.value,
      ];
    }
  }
}

let admGeoJsonStore: AdmGeoJsonStore | null = null;

export function injectAdmGeojsonStore(): AdmGeoJsonStore {
  return admGeoJsonStore ??= new AdmGeoJsonStore();
}
