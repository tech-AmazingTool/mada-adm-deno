import { AdmLevelCode } from "@scope/consts/models";

export const INITIAL_MAP_CENTER = [47.55295, -18.9189] as [number, number]; // Antananarivo
export const INITIAL_ZOOM = 5;
export const MAX_ZOOM = 19;

export const OFM_TILE_LAYER_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

export type TileLayerData = Record<
  | "LABEL"
  | "SOURCE"
  | "LAYER_ID"
  | "URL_TEMPLATE"
  | "ATTRIBUTION"
  | "SENTINEL_LAYER_ID"
  | "SENTINEL_SOURCE",
  string
>;

export const TILE_SIZE = 256;

export const ESRI_TILE_LAYER_DATA: TileLayerData = {
  LABEL: "Esri",
  SOURCE: "esri-satellite",
  LAYER_ID: "esri-sat",
  SENTINEL_LAYER_ID: "esri-sentinel",
  SENTINEL_SOURCE: "esri-sentinel-source",
  URL_TEMPLATE:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  // ATTRIBUTION: `© <a href="https://www.esri.com">Esri</a> - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community`,
  ATTRIBUTION: `© <a href="https://www.esri.com">Esri</a>`,
};

export const CARTO_DB_TILE_LAYER_DATA: TileLayerData = {
  LABEL: "CartoDB",
  SOURCE: "carto-labels",
  LAYER_ID: "carto-lbl",
  SENTINEL_LAYER_ID: "carto-sentinel",
  SENTINEL_SOURCE: "carto-sentinel-source",
  URL_TEMPLATE:
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
  ATTRIBUTION:
    `© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com">CartoDB</a>`,
};

export const OFM_VECTOR_TILE_SENTINEL_LAYER_ID = "ofm-vector-sentinel";

export const STATIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE = new Map<
  AdmLevelCode,
  string
>([
  [AdmLevelCode.PROVINCE, "static-adm-geojson-sentinel-provinces"],
  [AdmLevelCode.REGION, "static-adm-geojson-sentinel-regions"],
  [AdmLevelCode.DISTRICT, "static-adm-geojson-sentinel-districts"],
  [AdmLevelCode.COMMUNE, "static-adm-geojson-sentinel-communes"],
  [AdmLevelCode.FOKONTANY, "static-adm-geojson-sentinel-fokontanys"],
]);

export const STATIC_ADM_GEOJSON_SOURCE_BY_CODE = new Map<
  AdmLevelCode,
  string
>([
  [AdmLevelCode.PROVINCE, "static-adm-geojson-provinces-source"],
  [AdmLevelCode.REGION, "static-adm-geojson-regions-source"],
  [AdmLevelCode.DISTRICT, "static-adm-geojson-districts-source"],
  [AdmLevelCode.COMMUNE, "static-adm-geojson-communes-source"],
  [AdmLevelCode.FOKONTANY, "static-adm-geojson-fokontanys-source"],
]);

export const STATIC_ADM_GEOJSON_LAYER_ID_BY_CODE = new Map<
  AdmLevelCode,
  string
>([
  [AdmLevelCode.PROVINCE, "static-adm-geojson-provinces"],
  [AdmLevelCode.REGION, "static-adm-geojson-regions"],
  [AdmLevelCode.DISTRICT, "static-adm-geojson-districts"],
  [AdmLevelCode.COMMUNE, "static-adm-geojson-communes"],
  [AdmLevelCode.FOKONTANY, "static-adm-geojson-fokontanys"],
]);

export const STATIC_ADM_GEOJSON_OUTLINE_LAYER_ID_BY_CODE = new Map<
  AdmLevelCode,
  string
>([
  [AdmLevelCode.PROVINCE, "static-adm-geojson-provinces-outline"],
  [AdmLevelCode.REGION, "static-adm-geojson-regions-outline"],
  [AdmLevelCode.DISTRICT, "static-adm-geojson-districts-outline"],
  [AdmLevelCode.COMMUNE, "static-adm-geojson-communes-outline"],
  [AdmLevelCode.FOKONTANY, "static-adm-geojson-fokontanys-outline"],
]);

export const DYNAMIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE = new Map<
  AdmLevelCode,
  string
>([
  [AdmLevelCode.PROVINCE, "dynamic-adm-geojson-sentinel-provinces"],
  [AdmLevelCode.REGION, "dynamic-adm-geojson-sentinel-regions"],
  [AdmLevelCode.DISTRICT, "dynamic-adm-geojson-sentinel-districts"],
  [AdmLevelCode.COMMUNE, "dynamic-adm-geojson-sentinel-communes"],
  [AdmLevelCode.FOKONTANY, "dynamic-adm-geojson-sentinel-fokontanys"],
]);
