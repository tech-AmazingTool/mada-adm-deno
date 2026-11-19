import { useEffect, useMemo, useRef } from "preact/hooks";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import {
  AdmEntityDivisionWithEntry,
  type AppMapAdmEntityGeoJsonEntry,
} from "@/stores/app-map.store.ts";
import {
  addGeoJsonLayerToMap,
  getDynamicAdmGeoJsonLayerId,
  getDynamicAdmGeoJsonOutlineLayerId,
  getDynamicAdmGeoJsonSource,
} from "@/helpers/app-map.helper.ts";
import { tailwindCssColorVarToRgb } from "@/helpers/css-vars.helper.ts";
import { DYNAMIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE } from "@/consts/map.consts.ts";
import AppMapDynamicAdmGeoJsonLayerDivision from "@/components/shell/AppMapDynamicAdmGeoJsonLayerDivision.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

export type AppMapDynamicAdmGeoJsonLayerProps = {
  map: maplibregl.Map;
  admGeoJsonEntry: AppMapAdmEntityGeoJsonEntry;
};

export default function AppMapDynamicAdmGeoJsonLayer(
  { admGeoJsonEntry, map }: AppMapDynamicAdmGeoJsonLayerProps,
) {
  const { injectApiStore, injectAppMapStore } = useStoresContext();

  const apiStore = injectApiStore();

  const appMapStore = injectAppMapStore();

  const prevDivisionsRef = useRef<AdmEntityDivisionWithEntry[]>([]);
  const divisions = useMemo<AdmEntityDivisionWithEntry[]>(
    () => {
      return appMapStore
        .breakAdmAttributesDiscriminatedDivisionsWithEntry(
          admGeoJsonEntry.admEntityDiscriminated!,
        );
    },
    [
      admGeoJsonEntry,
      appMapStore.provinceGeoJsonEntryByName.value,
      appMapStore.regionGeoJsonEntryByName.value,
      appMapStore.districtGeoJsonEntryByName.value,
      appMapStore.communeGeoJsonEntryByName.value,
      appMapStore.fokontanyGeoJsonEntryByName.value,
    ],
  );

  const renderedDivisions = useMemo<AdmEntityDivisionWithEntry[]>(() => {
    return divisions.filter((division) => division.isRendered);
  }, [divisions]);

  const popupRef = useRef<maplibregl.Popup>(null);

  function handlePopup(popup: maplibregl.Popup) {
    const popupHTML = popup._content;
    const toggleInputs = popupHTML.querySelectorAll("[data-level-code]");

    async function handleToggleInputClick(e: Event) {
      e.preventDefault();
      const input = e.currentTarget as HTMLInputElement;
      const admLevelCode = input.dataset.levelCode! as AdmLevelCode;
      const division = divisions.find((division) =>
        division.admLevelCode === admLevelCode
      )!;
      if (division.isLoading) return;
      await appMapStore.toggleAdmEntityGeoJsonEntryOnMap(
        admGeoJsonEntry.admEntityDiscriminated!,
        admLevelCode,
        input.checked,
      );
    }

    for (const input of toggleInputs) {
      input.addEventListener("click", handleToggleInputClick);
    }
  }

  useEffect(() => {
    if (popupRef.current) {
      for (const division of divisions) {
        const input = popupRef.current._content.querySelector(
          `[data-level-code="${division.admLevelCode}"]`,
        ) as HTMLInputElement | null;
        if (input) {
          if (division.isLoading) {
            input.indeterminate = true;
          } else {
            input.indeterminate = false;
            input.checked = division.isRendered;
          }

          const toggleTooltipElt = input.parentElement!;
          const toggleTooltipText = division.isRendered
            ? "Remove from map"
            : "Show on map";
          toggleTooltipElt.setAttribute("data-tip", toggleTooltipText);
        }
      }
    }
    prevDivisionsRef.current = divisions;
  }, [divisions]);

  useEffect(() => {
    const admLevelCode = admGeoJsonEntry.admEntityDiscriminated!.admLevelCode;

    const source = getDynamicAdmGeoJsonSource(
      admLevelCode,
      admGeoJsonEntry.name,
    );

    if (map.getSource(source)) return;

    const sentinelLayerId = DYNAMIC_ADM_GEOJSON_SENTINEL_LAYER_ID_BY_CODE.get(
      admLevelCode,
    )!;

    const layerId = getDynamicAdmGeoJsonLayerId(
      admLevelCode,
      admGeoJsonEntry.name,
    );
    const outlineLayerId = getDynamicAdmGeoJsonOutlineLayerId(
      admLevelCode,
      admGeoJsonEntry.name,
    );

    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;
    const color = tailwindCssColorVarToRgb(admLevelTitle);

    const popupCleanup = addGeoJsonLayerToMap(map, admGeoJsonEntry.geojson!, {
      source,
      sentinelLayerId,
      layerId,
      outlineLayerId,
      color,
      renderPopupHTML() {
        const layerTitle = ADM_LEVEL_TITLE_BY_CODE.get(
          admLevelCode,
        )!;
        const layerTitleHTML = `
          <h3 class="font-bold text-sm flex items-center gap-x-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-landmark-icon lucide-landmark"><path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>
            <div>
              <span class="capitalize">${layerTitle}</span>
            </div>
          </h3>
        `;
        const divisions = prevDivisionsRef.current;
        const divisionsRowsHTML = divisions.map((division, i) => {
          const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(
            division.admLevelCode,
          )!;
          const toggleIsDisabled = !apiStore.initialAdmEntitiesAreLoaded;
          const tooltipText = division.isRendered
            ? "Remove from map"
            : "Show on map";
          const borderClassName = i === 0
            ? ""
            : "border-t border-t-solid border-t-base-content/30";
          return `
            <li class="${borderClassName} py-2">
              <div class="flex items-center justify-between gap-x-3">
                <div class="flex flex-col grow shrink basis-auto">
                  <em class="not-italic text-xs text-base-content/70 capitalize inline-block">
                    ${admLevelTitle}:
                  </em>
                  <p class="grow shrink basis-auto truncate text-sm">
                    ${division.text}
                  </p>
                </div>
                <div>
                  <div
                    class="tooltip tooltip-left"
                    data-tip="${tooltipText}"
                  >
                    <input
                      type="checkbox"
                      ${toggleIsDisabled ? "disabled" : ""}
                      ${division.isRendered ? "checked" : ""}
                      data-level-code="${division.admLevelCode}"
                      class="toggle toggle-${admLevelTitle}"
                    />
                  </div>
                </div>
              </div>
            </li>
          `;
        }).join("");
        return `
          <article>
            ${layerTitleHTML}
            <ul class="min-w-75">
              ${divisionsRowsHTML}
            </ul>
          </article>
        `;
      },
      onPopup(popup) {
        popupRef.current = popup;
        handlePopup(popup);
      },
      onPopupRemoved() {
        popupRef.current = null;
      },
    });

    return () => {
      popupCleanup();
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
        map.removeLayer(outlineLayerId);
        map.removeSource(source);
      }
    };
  }, []);

  return (
    <>
      {renderedDivisions.map((division) => {
        const key = `${division.admLevelCode}-${division.name}`;
        const isRootEntry = division.admLevelCode ===
          admGeoJsonEntry.admEntityDiscriminated!.admLevelCode;
        return (
          <AppMapDynamicAdmGeoJsonLayerDivision
            key={key}
            isRootEntry={isRootEntry}
            division={division}
          />
        );
      })}
    </>
  );
}
