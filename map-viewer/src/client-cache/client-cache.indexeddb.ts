import {
  ADM_GEOJSON_METADATA_STORE_NAME,
  ADM_GEOJSON_STORE_NAME,
  INDEXED_DB_NAME,
  INDEXED_DB_VERSION,
} from "@/consts/indexeddb.consts.ts";
import type { MaybePromise } from "@scope/types/utils";

export class ClientCacheIndexdDbConnection {
  #db: IDBDatabase | null = null;

  get db(): MaybePromise<IDBDatabase> {
    return this.#db ?? this.open();
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        db.createObjectStore(ADM_GEOJSON_STORE_NAME, {
          keyPath: "admLevelCode",
        });
        db.createObjectStore(ADM_GEOJSON_METADATA_STORE_NAME, {
          keyPath: "admLevelCode",
        });
      };
      request.onsuccess = (e) => {
        this.#db = (e.target as IDBOpenDBRequest).result;
        resolve(this.#db);
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }
}

let _instance: ClientCacheIndexdDbConnection | null = null;

export function injectClientCacheIndexdDbConnection(): ClientCacheIndexdDbConnection {
  return _instance ?? (_instance = new ClientCacheIndexdDbConnection());
}
