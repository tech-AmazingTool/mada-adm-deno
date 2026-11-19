import { AdmLevelCode } from "@scope/consts/models";
import {
  ADM_GEOJSON_METADATA_STORE_NAME,
  ADM_GEOJSON_STORE_NAME,
} from "@/consts/indexeddb.consts.ts";
import { ClientCacheIndexdDbConnection } from "./client-cache.indexeddb.ts";
import {
  AdmGeojsonClientCacheItem,
  AdmGeojsonMetadataClientCacheItem,
} from "@/types/cache.d.ts";

export type UpsertAdmGeoJsonPayload =
  & AdmGeojsonMetadataClientCacheItem
  & AdmGeojsonClientCacheItem;

export class AdmGeojsonClientCache {
  readonly metadataStore = ADM_GEOJSON_METADATA_STORE_NAME;
  readonly geojsonStore = ADM_GEOJSON_STORE_NAME;

  #connection!: ClientCacheIndexdDbConnection;

  constructor(indexedDbConnection: ClientCacheIndexdDbConnection) {
    this.#connection = indexedDbConnection;
  }

  async getAllMetadata(): Promise<AdmGeojsonMetadataClientCacheItem[]> {
    const db = await this.#connection.db;
    const transaction = db.transaction(this.metadataStore, "readonly");
    const store = transaction.objectStore(this.metadataStore);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getMetadataByCode(
    admLevelCode: AdmLevelCode,
  ): Promise<AdmGeojsonMetadataClientCacheItem | null> {
    const db = await this.#connection.db;
    const transaction = db.transaction(this.metadataStore, "readonly");
    const store = transaction.objectStore(this.metadataStore);
    const request = store.get(admLevelCode);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllGeoJson(): Promise<AdmGeojsonClientCacheItem[]> {
    const db = await this.#connection.db;
    const transaction = db.transaction(this.geojsonStore, "readonly");
    const store = transaction.objectStore(this.geojsonStore);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getGeojsonByCode(
    admLevelCode: AdmLevelCode,
  ): Promise<AdmGeojsonClientCacheItem | null> {
    const db = await this.#connection.db;
    const transaction = db.transaction(this.geojsonStore, "readonly");
    const store = transaction.objectStore(this.geojsonStore);
    const request = store.get(admLevelCode);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async upsert(payload: UpsertAdmGeoJsonPayload): Promise<void> {
    const db = await this.#connection.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.geojsonStore, this.metadataStore],
        "readwrite",
      );
      const metadataStore = transaction.objectStore(this.metadataStore);
      const geojsonStore = transaction.objectStore(this.geojsonStore);

      let req = metadataStore.get(payload.admLevelCode);
      req.onsuccess = () => {
        const admGeoJsonMetadata =
          (req.result as AdmGeojsonMetadataClientCacheItem) ?? null;

        req = admGeoJsonMetadata
          ? metadataStore.put(payload)
          : metadataStore.add(payload);
        req.onsuccess = () => {
          const geoJson: AdmGeojsonClientCacheItem = {
            admLevelCode: payload.admLevelCode,
            geojson: payload.geojson,
          };
          const req = geojsonStore.put(geoJson);
          req.onsuccess = () => {
            resolve();
          };
          req.onerror = () => {
            reject(req.error);
          };
        };
        req.onerror = () => {
          reject(req.error);
        };
      };
      req.onerror = () => {
        reject(req.error);
      };
    });
  }
}

let _instance: AdmGeojsonClientCache | null = null;

export function injectAdmGeojsonClientCache(
  indexedDbConnection: ClientCacheIndexdDbConnection,
): AdmGeojsonClientCache {
  return _instance ??
    (_instance = new AdmGeojsonClientCache(indexedDbConnection));
}
