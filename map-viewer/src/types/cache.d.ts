import { AdmLevelCode } from "@scope/consts/models";
import { GeoJSONFeatureCollection } from "@scope/types/utils";

export type AdmGeojsonMetadataClientCacheItem = {
  admLevelCode: AdmLevelCode;
  version: number;
  lastModified: Date;
};

export type AdmGeojsonClientCacheItem = {
  admLevelCode: AdmLevelCode;
  geojson: GeoJSONFeatureCollection<Record<string, unknown>>;
};
