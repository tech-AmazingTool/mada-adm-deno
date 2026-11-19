/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ADM GeoJSON data versions
  readonly VITE_PROVINCE_ADM_GEOJSON_VERSION?: string;
  readonly VITE_REGION_ADM_GEOJSON_VERSION?: string;
  readonly VITE_DISTRICT_ADM_GEOJSON_VERSION?: string;
  readonly VITE_COMMUNE_ADM_GEOJSON_VERSION?: string;
  readonly VITE_FOKONTANY_ADM_GEOJSON_VERSION?: string;

  // UI, API, and state based env variables
  readonly VITE_PUBLIC_REST_API_BASE_URL?: string;
  readonly VITE_PUBLIC_GLOBAL_MODE_ADM_ENTITIES_COUNT?: string;
  readonly VITE_PUBLIC_CASCADE_MODE_ADM_ENTITIES_COUNT?: string;
  readonly VITE_PUBLIC_SEARCH_MIN_LENGTH?: string;
  readonly VITE_PUBLIC_SEARCH_DEBOUNCE_DELAY?: string;
  readonly VITE_PUBLIC_PAGE_CONTENT_DRAWER_DEFAULT_OPEN?: string;
  readonly VITE_PUBLIC_UNREFERENCED_ADM_GEOJSON_CLEANUP_INTERVAL?: string;
  readonly VITE_PUBLIC_GEOLOCATION_TIMEOUT?: string;
  readonly VITE_PUBLIC_GEOLOCATION_COORDINDATE_EPSILON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
