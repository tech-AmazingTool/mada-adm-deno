import { Signal } from "@preact/signals";
import maplibregl from "maplibre-gl";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
} from "@scope/consts/models";
import { AdmGeoJsonLayerCheckedState } from "@/types/app-map.d.ts";
import {
  CARTO_DB_TILE_LAYER_DATA,
  DYNAMIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE,
  ESRI_TILE_LAYER_DATA,
  OFM_VECTOR_TILE_SENTINEL_LAYER_ID,
  STATIC_ADM_GEOJSON_LAYER_ID_BY_CODE,
  STATIC_ADM_GEOJSON_OUTLINE_LAYER_ID_BY_CODE,
  STATIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE,
  STATIC_ADM_GEOJSON_SOURCE_BY_CODE,
  TILE_SIZE,
} from "@/consts/map.consts.ts";
import { GeoJSONFeatureCollection } from "@scope/types/utils";
import { tailwindCssColorVarToRgb } from "@/helpers/css-vars.helper.ts";
import {
  addGeoJsonLayerToMap,
  fitGeoJsonBboxIntoMap,
} from "@/helpers/app-map.helper.ts";

export type LayerSwitcherControlOptions = {
  onAdmGeoJsonLayerCheckoxChange: (
    admLevelCode: AdmLevelCode,
    checked: boolean,
  ) => void;
  admGeoJsonLayersCheckboxesStates: Signal<AdmGeoJsonLayerCheckedState[]>;
};

export type AddStaticAdmGeoJsonLayerOptions = {
  fitBbox?: boolean;
};

export class LayerSwitcherControl implements maplibregl.IControl {
  private container!: HTMLElement;
  private map: maplibregl.Map;
  private satelliteLoaded = false;

  private onAdmGeoJsonLayerCheckoxChange:
    LayerSwitcherControlOptions["onAdmGeoJsonLayerCheckoxChange"];
  private admGeoJsonLayersCheckboxesStatesSubscriber!: () => void;

  private admGeoJsonLayersChecboxesByCode?: Map<
    AdmLevelCode,
    HTMLInputElement
  >;

  constructor(map: maplibregl.Map, options: LayerSwitcherControlOptions) {
    this.map = map;
    this.onAdmGeoJsonLayerCheckoxChange = options
      ?.onAdmGeoJsonLayerCheckoxChange;

    this.admGeoJsonLayersCheckboxesStatesSubscriber = options
      .admGeoJsonLayersCheckboxesStates
      .subscribe((states) => {
        if (!this.admGeoJsonLayersChecboxesByCode) return;
        for (const state of states) {
          const checkbox = this.admGeoJsonLayersChecboxesByCode.get(
            state.code,
          )!;
          if (
            typeof state.checked === "boolean" &&
            checkbox.checked !== state.checked
          ) {
            checkbox.checked = state.checked;
            checkbox.indeterminate = false;
          } else if (state.checked === "loading") {
            checkbox.indeterminate = true;
          } else {
            checkbox.indeterminate = false;
          }
        }
      });

    map.on("load", () => {
      const firstSymbolLayerId = map.getStyle().layers.find(
        (layer) => layer.type === "symbol",
      )!.id;
      let prevStaticAdmGeoJsonLayerId = firstSymbolLayerId;
      for (const admLevelCode of ADM_LEVEL_CODES_INDEXED.toReversed()) {
        const staticAdmGeoJsonSentinelLayerId =
          STATIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE.get(
            admLevelCode,
          )!;
        this.addSentinelLayer(
          staticAdmGeoJsonSentinelLayerId,
          prevStaticAdmGeoJsonLayerId,
        );
        prevStaticAdmGeoJsonLayerId = staticAdmGeoJsonSentinelLayerId;
      }
      this.addSentinelLayer(
        ESRI_TILE_LAYER_DATA.SENTINEL_LAYER_ID,
        prevStaticAdmGeoJsonLayerId,
      );
      this.addSentinelLayer(OFM_VECTOR_TILE_SENTINEL_LAYER_ID);
      this.addSentinelLayer(CARTO_DB_TILE_LAYER_DATA.SENTINEL_LAYER_ID);
      for (const admLevelCode of ADM_LEVEL_CODES_INDEXED) {
        const dynamicAdmGeoJsonSentinelLayerId =
          DYNAMIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE.get(
            admLevelCode,
          )!;
        this.addSentinelLayer(dynamicAdmGeoJsonSentinelLayerId);
      }
    });
  }

  private addSentinelLayer(layerId: string, beforeLayerId?: string) {
    this.map.addLayer({
      id: layerId,
      type: "background",
      layout: { visibility: "none" },
    }, beforeLayerId);
  }

  hasStaticAdmGeoJsonLayer(admLevelCode: AdmLevelCode) {
    const source = STATIC_ADM_GEOJSON_SOURCE_BY_CODE.get(admLevelCode)!;
    return this.map.getSource(source) !== undefined;
  }

  private readonly staticAdmGeoJsonLayerCleanupByCode = new Map<
    AdmLevelCode,
    () => void
  >();

  async addStaticAdmGeoJsonLayer(
    admLevelCode: AdmLevelCode,
    geojson: GeoJSONFeatureCollection<Record<string, unknown>>,
    options?: AddStaticAdmGeoJsonLayerOptions,
  ) {
    const { fitBbox = true } = options ?? {};

    const cleanup = addGeoJsonLayerToMap(this.map, geojson, {
      source: STATIC_ADM_GEOJSON_SOURCE_BY_CODE.get(admLevelCode)!,
      sentinelLayerId: STATIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE.get(
        admLevelCode,
      )!,
      color: tailwindCssColorVarToRgb("primary"),
      layerId: STATIC_ADM_GEOJSON_LAYER_ID_BY_CODE.get(admLevelCode)!,
      outlineLayerId: STATIC_ADM_GEOJSON_OUTLINE_LAYER_ID_BY_CODE.get(
        admLevelCode,
      )!,
      renderPopupHTML(features) {
        const feature = features![0];
        const featureProperties = Object.entries(feature.properties!);
        const layerTitle = ADM_LEVEL_TITLE_BY_CODE.get(
          admLevelCode,
        )!;
        const layerTitleHTML = `
          <h3 class="font-bold text-sm flex items-center gap-x-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers2-icon lucide-layers-2"><path d="M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z"/><path d="m20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845"/></svg>
            <div>
              ${admLevelCode}:
              <span class="capitalize">${layerTitle}s</span>
            </div>
          </h3>
        `;
        const featuresRowsHTML = featureProperties.map(([key, value]) => {
          return `<tr><td>${key}</td><td>${value}</td></tr>`;
        }).join("");
        return `
          <article>
            ${layerTitleHTML}
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                ${featuresRowsHTML}
              </tbody>
            </table>
          </article>
        `;
      },
    });

    this.staticAdmGeoJsonLayerCleanupByCode.set(admLevelCode, cleanup);

    if (fitBbox) {
      await fitGeoJsonBboxIntoMap(this.map, geojson);
    }
  }

  removeStaticAdmGeoJsonLayer(admLevelCode: AdmLevelCode) {
    const layerId = STATIC_ADM_GEOJSON_LAYER_ID_BY_CODE.get(admLevelCode)!;
    this.map.removeLayer(layerId);
    const outlineLayerId = STATIC_ADM_GEOJSON_OUTLINE_LAYER_ID_BY_CODE.get(
      admLevelCode,
    )!;
    this.map.removeLayer(outlineLayerId);
    const source = STATIC_ADM_GEOJSON_SOURCE_BY_CODE.get(admLevelCode)!;
    this.map.removeSource(source);
    const cleanup = this.staticAdmGeoJsonLayerCleanupByCode.get(admLevelCode);
    cleanup?.();
    this.staticAdmGeoJsonLayerCleanupByCode.delete(admLevelCode);
  }

  onAdd(map: maplibregl.Map) {
    this.map = map;

    this.container = document.createElement("div");
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group layer-switcher";
    this.container.style.marginLeft = "12px";
    const admBoundariesInputName = "adm-level-boundaries";
    const admBoundariesCheckboxesHTML = ADM_LEVEL_CODES_INDEXED.map((code) => {
      const title = ADM_LEVEL_TITLE_BY_CODE.get(code);
      const id = admBoundariesInputName + "-" + code;
      return `
        <li>
          <label for="${id}">
            <input type="checkbox" name="${admBoundariesInputName}" value="${code}" id="${id}" class="checkbox checkbox-primary checkbox-xs" />
            <div class="flex">
              ${code}: <span class="capitalize">${title}s</span>
            </div>
          </label>
        </li>
      `;
    }).join("");
    const baseTileLayerInputName = "map-base-tile";
    this.container.innerHTML = `
      <div>
        <div class="tooltip tooltip-right" data-tip="Map layers">
          <div>
            <div class="dropdown dropdown-top dropdown-start">
              <div id="app-map-layers-switcher-control-btn" tabindex="0" role="button" class="btn btn-square m-1 text-base-content/90 hover:text-base-content duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers-icon lucide-layers"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>
              </div>
              <div tabindex="-1" class="dropdown-content bg-base-100 rounded-box z-1 w-52 shadow-sm">
                <ul class="menu menu-sm w-full">
                  <li class="menu-title text-xs">Administrative boundaries</li>
                  ${admBoundariesCheckboxesHTML}
                </ul>
                <ul class="menu menu-sm w-full">
                  <li class="menu-title text-xs">View</li>
                  <li>
                    <label for="map-base-tile-vector">
                      <input type="radio" name="${baseTileLayerInputName}" value="vector" id="map-base-tile-vector" class="radio radio-xs radio-primary" checked="checked" />
                      Vector
                    </label>
                  </li>
                  <li>
                    <label for="map-base-tile-satellite">
                      <input type="radio" name="${baseTileLayerInputName}" value="satellite" id="map-base-tile-satellite" class="radio radio-xs radio-primary" />
                      Satellite
                    </label>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Base tile layer radio change
    this.container.querySelectorAll<HTMLInputElement>(
      `input[name="${baseTileLayerInputName}"]`,
    ).forEach((radio) => {
      radio.addEventListener("change", () => {
        this.setMode(radio.value as "vector" | "satellite");
      });
    });

    // Adm geojson layer checkboxes
    const admGeoJsonLayerCheckboxes = this.container.querySelectorAll<
      HTMLInputElement
    >(
      `input[name|="${admBoundariesInputName}"]`,
    );
    this.admGeoJsonLayersChecboxesByCode = new Map();
    for (const input of admGeoJsonLayerCheckboxes) {
      const code = input.value as AdmLevelCode;
      this.admGeoJsonLayersChecboxesByCode.set(code, input);
      input.addEventListener("change", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onAdmGeoJsonLayerCheckoxChange(
          code,
          input.checked,
        );
      }, { capture: true });
    }

    return this.container;
  }

  private setMode(mode: "vector" | "satellite") {
    if (mode === "satellite" && !this.satelliteLoaded) {
      this.map.addSource(ESRI_TILE_LAYER_DATA.SOURCE, {
        type: "raster",
        tiles: [ESRI_TILE_LAYER_DATA.URL_TEMPLATE],
        tileSize: TILE_SIZE,
        attribution: ESRI_TILE_LAYER_DATA.ATTRIBUTION,
      });
      this.map.addSource(CARTO_DB_TILE_LAYER_DATA.SOURCE, {
        type: "raster",
        tiles: ["a", "b", "c"].map((_) =>
          CARTO_DB_TILE_LAYER_DATA.URL_TEMPLATE.replace("{s}", _)
        ),
        tileSize: TILE_SIZE,
        attribution: CARTO_DB_TILE_LAYER_DATA.ATTRIBUTION,
      });
      this.map.addLayer(
        {
          id: ESRI_TILE_LAYER_DATA.LAYER_ID,
          type: "raster",
          source: ESRI_TILE_LAYER_DATA.SOURCE,
        },
        ESRI_TILE_LAYER_DATA.SENTINEL_LAYER_ID,
      );
      this.map.addLayer(
        {
          id: CARTO_DB_TILE_LAYER_DATA.LAYER_ID,
          type: "raster",
          source: CARTO_DB_TILE_LAYER_DATA.SOURCE,
        },
        CARTO_DB_TILE_LAYER_DATA.SENTINEL_LAYER_ID,
      );
      this.satelliteLoaded = true;
    }

    const nonVectorLayers: string[] = [
      ESRI_TILE_LAYER_DATA.SENTINEL_LAYER_ID,
      ESRI_TILE_LAYER_DATA.LAYER_ID,
      ...STATIC_ADM_GEOJSON_LAYER_ID_BY_CODE.values(),
      ...STATIC_ADM_GEOJSON_OUTLINE_LAYER_ID_BY_CODE.values(),
      ...STATIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE.values(),
    ];

    for (const layer of this.map.getStyle().layers) {
      if (layer.id === OFM_VECTOR_TILE_SENTINEL_LAYER_ID) break;
      if (nonVectorLayers.includes(layer.id)) {
        if (layer.id === ESRI_TILE_LAYER_DATA.LAYER_ID) {
          this.map.setLayoutProperty(
            layer.id,
            "visibility",
            mode === "vector" ? "none" : "visible",
          );
        }
        continue;
      } else {
        this.map.setLayoutProperty(
          layer.id,
          "visibility",
          mode === "vector" ? "visible" : "none",
        );
      }
    }

    this.map.setLayoutProperty(
      CARTO_DB_TILE_LAYER_DATA.LAYER_ID,
      "visibility",
      mode === "vector" ? "none" : "visible",
    );
  }

  onRemove() {
    this.container.remove();
    this.admGeoJsonLayersCheckboxesStatesSubscriber();
  }
}
