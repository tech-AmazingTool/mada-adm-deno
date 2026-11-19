import { useEffect, useRef } from "preact/hooks";
import { Signal, useSignal } from "@preact/signals";
import maplibregl from "maplibre-gl";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { AdmEntityDiscriminated } from "@scope/types/models";
import { PinnedLocationEntry } from "@/stores/pinned-locations.store.ts";
import { formatGeographicCoordinates } from "@/helpers/pinned-locations.helper.ts";
import { convert } from "geo-coordinates-parser";
import {
  GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS,
  GeographicCoordinateOutputFormat,
  PINNED_LOCATION_ADM_TERRITORY_ERROR_MESSAGE_BY_CAUSE,
  PinnedLocationErrorCause,
} from "@/consts/pinned-locations.consts.ts";
import useDynamicDateTime from "@/hooks/useDynamicDateTime.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";
import { ApiStore } from "@/stores/api.store.ts";

export type UseAddPinnedLocationMarkerPopupOptions = {
  isCurrentLocation?: boolean;
  onTitleEdited?: (newTitle: string) => void | Promise<void>;
  onCoordinatesEdited?: (
    coordinates: { lat: number; lng: number },
  ) => void | Promise<void>;
  onLockMarkerToggled?: (isLocked: boolean) => void | Promise<void>;
  onDelete?: (pinnedLocationId: number) => void | Promise<void>;
};

export type UseAddPinnedLocationMarkerPopupAdmTerritoryParams = {
  fokontanyDiscriminated: AdmEntityDiscriminated | null;
  fokontanyDivisions: AdmEntityDivisionWithEntry[] | null;
};

export type UseAddPinnedLocationMarkerPopupResult = {
  markerPopup: Signal<maplibregl.Popup | null>;
};

const ADM_TERRITORY_LOADING_HTML =
  `<span title="Resolving the ADM territory ..." class="loading loading-dots loading-sm text-base-content/60"></span>`;
const ADM_TERRITORY_ERROR_HTML =
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert text-error" title="Failed to resolve the ADM territory"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

const ADM_TERRITORY_BODY_LOADING_HTML = `
  <span class="flex items-center gap-x-2 text-xs text-base-content/60 mb-2">
    <span class="loading loading-spinner loading-sm"></span>
    Resolving the ADM territory ...
  </span>
`;

function getAdmTerritoryBodyErrorHTML(
  errorCause: PinnedLocationErrorCause | null | undefined,
) {
  if (!errorCause) return "";
  const errorMessage = PINNED_LOCATION_ADM_TERRITORY_ERROR_MESSAGE_BY_CAUSE.get(
    errorCause,
  );
  return `
    <div class="flex items-start gap-x-2 text-error mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      <p class="text-xs">${errorMessage}</p>
    </div>
  `;
}

function getFokontanyDivisionsHTML(
  fokontanyDivisions: AdmEntityDivisionWithEntry[] | null,
  apiStore: ApiStore,
) {
  if (!fokontanyDivisions) return "";
  return fokontanyDivisions.map((division, i) => {
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(division.admLevelCode)!;
    const toggleIsDisabled = !apiStore.initialAdmEntitiesAreLoaded;
    const tooltipText = division.isRendered ? "Remove from map" : "Show on map";
    const borderClassName = i === 0
      ? ""
      : "border-t border-t-solid border-t-base-content/30";
    return `
      <li class="${borderClassName} pt-1.5 pb-2">
        <div class="flex items-center justify-between gap-x-3">
          <div class="flex flex-col grow shrink basis-auto">
            <em class="not-italic text-[0.65rem] text-base-content/70 capitalize inline-block">
              ${admLevelTitle}:
            </em>
            <p class="grow shrink basis-auto truncate text-xs">
              ${division.text}
            </p>
          </div>
          <div>
            <div class="tooltip tooltip-left" data-tip="${tooltipText}">
              <input
                type="checkbox"
                ${toggleIsDisabled ? "disabled" : ""}
                ${division.isRendered ? "checked" : ""}
                data-level-code="${division.admLevelCode}"
                class="toggle toggle-xs toggle-${admLevelTitle}"
              />
            </div>
          </div>
        </div>
      </li>
    `;
  }).join("");
}

const LOCK_MARKER_DRAGGABLE_BADGE_HTML = `
  <div class="badge badge-sm badge-primary">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-icon lucide-move"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>
    Draggable
  </div>
`;

export default function useAddPinnedLocationMarkerPopup(
  pinnedLocationEntry: Signal<PinnedLocationEntry | null>,
  admTerritory: UseAddPinnedLocationMarkerPopupAdmTerritoryParams,
  options: UseAddPinnedLocationMarkerPopupOptions = {},
): UseAddPinnedLocationMarkerPopupResult {
  const { isCurrentLocation = false } = options;
  const onTitleEditedRef = useRef(options.onTitleEdited);
  onTitleEditedRef.current = options.onTitleEdited;
  const onCoordinatesEditedRef = useRef(options.onCoordinatesEdited);
  onCoordinatesEditedRef.current = options.onCoordinatesEdited;
  const onLockMarkerToggledRef = useRef(options.onLockMarkerToggled);
  onLockMarkerToggledRef.current = options.onLockMarkerToggled;
  const onDeleteRef = useRef(options.onDelete);
  onDeleteRef.current = options.onDelete;

  const lastUpdatedAtDynamic = useDynamicDateTime(
    pinnedLocationEntry.value?.updatedAt,
  );
  const lastUpdatedAtIntlFormatterRef = useRef<Intl.DateTimeFormat>(
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  );

  useEffect(() => {
    if (pinnedLocationEntry.value?.updatedAt) {
      lastUpdatedAtDynamic.start(pinnedLocationEntry.value.updatedAt);
    } else {
      lastUpdatedAtDynamic.clear();
    }
  }, [pinnedLocationEntry.value?.updatedAt]);

  const { fokontanyDiscriminated, fokontanyDivisions } = admTerritory;

  const apiStore = useStoresContext().injectApiStore();

  const appMapStore = useStoresContext().injectAppMapStore();

  const wasCreated = useRef(false);

  const markerPopup = useSignal<maplibregl.Popup | null>(null);

  const loadingContainerRef = useRef<HTMLDivElement | null>(null);
  const errorContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyLoadingContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyErrorContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyDivisionsContainerRef = useRef<HTMLUListElement | null>(null);
  const titleContainerRef = useRef<HTMLSpanElement | null>(null);
  const coordinatesFormattedContainerRef = useRef<HTMLParagraphElement | null>(
    null,
  );
  const outputFormatSelectRef = useRef<HTMLSelectElement | null>(null);
  const lockMarkerToggleRef = useRef<HTMLInputElement | null>(null);
  const draggableMarkerBadgeSectionRef = useRef<HTMLDivElement | null>(null);

  const copyToClipboardTextResetterTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  useEffect(
    () => {
      const entry = pinnedLocationEntry.value;

      if (wasCreated.current || !entry) return;

      wasCreated.current = true;

      const targetLocationIconSVG = `
        <svg class="shrink-0 relative top-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" fill="currentColor" /><path fill-rule="evenodd" clip-rule="evenodd" d="M2.08296 7C2.50448 4.48749 4.48749 2.50448 7 2.08296V0H9V2.08296C11.5125 2.50448 13.4955 4.48749 13.917 7H16V9H13.917C13.4955 11.5125 11.5125 13.4955 9 13.917V16H7V13.917C4.48749 13.4955 2.50448 11.5125 2.08296 9H0V7H2.08296ZM4 8C4 5.79086 5.79086 4 8 4C10.2091 4 12 5.79086 12 8C12 10.2091 10.2091 12 8 12C5.79086 12 4 10.2091 4 8Z" fill="currentColor"/></svg>
      `;
      const markerIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
      `;
      const popupTitleIconSVG = isCurrentLocation
        ? targetLocationIconSVG
        : markerIconSVG;
      const popupTitle = isCurrentLocation ? "Current location" : entry.title;

      const editTitleFormHTML = !isCurrentLocation
        ? `
        <form data-title-edit-form class="mt-3">
          <div data-title-edit-inactive-view>
            <button type="button" data-title-edit-toggle class="btn btn-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
              Edit title
            </button>
          </div>
          <div data-title-edit-active-view class="hidden px-3 py-2 rounded-sm shadow-md shadow-primary/20 bg-base-100 border border-base-content/10">
            <fieldset class="fieldset">
              <label for="edit-title-${entry.id}" class="label p-0 text-xs">Title</label>
              <input type="text" id="edit-title-${entry.id}" data-title-edit-input class="input input-xs w-full" value="${popupTitle}" />
              <span data-title-edit-error class="text-error text-[0.65rem] leading-tight hidden">The pinned location title must not be empty</span>
              <div class="flex items-center gap-x-2 mt-1.5">
                <button type="submit" data-title-edit-save class="btn btn-xs btn-primary">Save</button>
                <button type="button" data-title-edit-cancel class="btn btn-xs">Cancel</button>
              </div>
            </fieldset>
          </div>
        </form>
      `
        : "";

      const editCoordinatesFormHTML = !isCurrentLocation
        ? `
        <form data-coordinates-edit-form>
          <div data-coordinates-edit-inactive-view class="mt-1.5">
            <button type="button" data-coordinates-edit-toggle class="btn btn-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
              Edit coordinates
            </button>
          </div>
          <div data-coordinates-edit-active-view class="hidden px-3 py-2 rounded-sm shadow-md shadow-primary/20 bg-base-100 border border-base-content/10 mt-2">
            <fieldset class="fieldset">
              <label for="edit-coordinates-${entry.id}" class="label p-0 text-xs">Coordinates</label>
              <input type="text" id="edit-coordinates-${entry.id}" data-coordinates-edit-input class="input input-xs w-full" placeholder="Geographic coordinates in any correct format" />
              <span data-coordinates-edit-error class="text-error text-[0.65rem] leading-tight hidden">Could not parse the coordinates being entered</span>
              <div class="flex items-center gap-x-2 mt-1.5">
                <button type="submit" data-coordinates-edit-save class="btn btn-xs btn-primary">Save</button>
                <button type="button" data-coordinates-edit-cancel class="btn btn-xs">Cancel</button>
              </div>
            </fieldset>
          </div>
        </form>
      `
        : "";

      const lockMarkerDraggableBadgeHTML =
        !isCurrentLocation && !pinnedLocationEntry.value?.isLocked
          ? LOCK_MARKER_DRAGGABLE_BADGE_HTML
          : "";

      const lockMarkerSectionHTML = !isCurrentLocation
        ? `
          <div data-lock-marker-container class="flex items-center gap-x-3">
            <fieldset class="fieldset">
              <label class="label text-xs text-base-content/90">
                Lock marker
                <input
                  type="checkbox"
                  class="toggle toggle-xs toggle-primary"
                />
              </label>
            </fieldset>
            <div data-draggable-badge class="flex items-center">
              ${lockMarkerDraggableBadgeHTML}
            </div>
          </div>
        `
        : "";

      const markerPopupOutputFormatSelectOptionsHTML =
        GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS
          .map((option) => {
            const selectedAttributeHTML =
              option.value === GeographicCoordinateOutputFormat.DecimalDegrees
                ? "selected"
                : "";
            return `
              <option
                ${selectedAttributeHTML}
                value="${option.value}"
              >
                ${option.label}
              </option>
            `;
          })
          .join("");

      const coordinatesFormatted = formatGeographicCoordinates(
        entry.coordinates,
        GeographicCoordinateOutputFormat.DecimalDegrees,
      );

      const markerPopupCoordinatesFormattedDataAttrValue =
        entry.coordinates.lng + "," +
        entry.coordinates.lat;

      const copyIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      `;
      const copiedIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check text-success"><path d="M20 6 9 17l-5-5"/></svg>
      `;
      const checkIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-check-icon lucide-copy-check text-success-content"><path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      `;

      const isLoadingFokontany = entry.isLoadingFokontany;
      const fokontanyErrorCause = entry.fokontanyErrorCause;

      let initialBodyLoadingHTML = "";
      let initialBodyLoadingClass = "hidden";
      if (!entry.fokontany && isLoadingFokontany) {
        initialBodyLoadingHTML = ADM_TERRITORY_BODY_LOADING_HTML;
        initialBodyLoadingClass = "contents";
      }

      let initialBodyErrorHTML = "";
      let initialBodyErrorClass = "hidden";
      if (fokontanyErrorCause) {
        initialBodyErrorHTML = getAdmTerritoryBodyErrorHTML(
          fokontanyErrorCause,
        );
        initialBodyErrorClass = "contents";
      }

      let initialDivisionsHTML = "";
      let initialDivisionsClass = "hidden";
      if (
        !(!entry.fokontany && isLoadingFokontany) && !fokontanyErrorCause &&
        fokontanyDivisions
      ) {
        initialDivisionsHTML = getFokontanyDivisionsHTML(
          fokontanyDivisions,
          apiStore,
        );
        initialDivisionsClass = "";
      }

      const deleteMarkerBtnHTML = isCurrentLocation
        ? `
          <button type="button" data-pinned-location-delete class="btn btn-sm btn-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-locate-off-icon lucide-locate-off"><path d="M12 19v3"/><path d="M12 2v3"/><path d="M18.89 13.24a7 7 0 0 0-8.13-8.13"/><path d="M19 12h3"/><path d="M2 12h3"/><path d="m2 2 20 20"/><path d="M7.05 7.05a7 7 0 0 0 9.9 9.9"/></svg>
            Stop tracking
          </button>
        `
        : `
          <button type="button" data-pinned-location-delete class="btn btn-sm btn-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-off-icon lucide-pin-off"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>
            Unpin location
          </button>
        `;

      const markerPopupHTML = `
        <article class="w-[20rem] space-y-3.5">
          <div>
            <h5 class="flex items-start gap-x-1.5 text-sm font-bold text-base-content">
              ${popupTitleIconSVG}
              <span data-pinned-location-popup-title="${popupTitle}">${popupTitle}</span>
            </h5>
            ${editTitleFormHTML}
          </div>
          <div class="space-y-2">
            <fieldset class="fieldset">
              <label for="current-location-popup-output-format-${entry.id}" class="label">
                Output format
              </label>
              <div>
                <select
                  id="current-location-popup-output-format-${entry.id}"
                  data-current-location-popup-output-format
                  name="outputName"
                  class="select select-xs w-fit"
                >
                  ${markerPopupOutputFormatSelectOptionsHTML}
                </select>
              </div>
            </fieldset>
            <section aria-label="Coordinates" data-coordinates-container>
              <div data-coordinates-view class="flex items-center gap-x-2 py-1">
                <div>
                  <h5
                    data-current-location-card-title
                    class="text-xs text-base-content/60 mb-1.25"
                  >
                    Coordinates
                  </h5>
                  <p data-coordinates-formatted="${markerPopupCoordinatesFormattedDataAttrValue}" class="text-xs text-base-content/90">
                    ${coordinatesFormatted ?? ""}
                  </p>
                </div>
                <div data-copy-to-clipboard-component="coordinates-formatted" class="tooltip">
                  <div class="tooltip-content">
                    <p class="text-xs">
                      Copy to clipboard
                    </p>
                  </div>
                  <button type="button" class="btn btn-sm btn-square">
                    ${copyIconSVG}
                  </button>
                </div>
              </div>
              ${editCoordinatesFormHTML}
            </section>
          </div>
          ${lockMarkerSectionHTML}
          <div data-collapse data-open="false" class="rounded-lg border border-base-content/20 bg-white">
            <button type="button" data-collapse-trigger aria-expanded="false"
                    class="cursor-pointer flex w-full items-center justify-between gap-4 px-3 py-3 text-left font-medium text-base-content transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg">
              <div class="flex items-center gap-x-3">
                <span
                  class="font-bold flex items-center gap-x-1.5"
                  style="font-size: 0.8125rem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-landmark-icon lucide-landmark"><path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>
                  ADM territory
                </span>
                <div data-adm-territory-loading-container class="contents">
                  ${isLoadingFokontany ? ADM_TERRITORY_LOADING_HTML : ""}
                </div>
                <div data-adm-territory-error-container class="contents">
                  ${fokontanyErrorCause ? ADM_TERRITORY_ERROR_HTML : ""}
                </div>
              </div>
              <svg data-collapse-icon viewBox="0 0 24 24" width="18" height="18" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round"
                   class="shrink-0 text-slate-500 transition-transform duration-300 ease-out">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div data-collapse-panel class="grid transition-[grid-template-rows] duration-300 ease-out" style="grid-template-rows: 0fr;">
              <div class="min-h-0 overflow-hidden">
                <div class="px-3 pb-4 pt-1">
                  <div data-adm-territory-body-loading-container class="${initialBodyLoadingClass}">
                    ${initialBodyLoadingHTML}
                  </div>
                  <div data-adm-territory-body-error-container class="${initialBodyErrorClass}">
                    ${initialBodyErrorHTML}
                  </div>
                  <ul data-adm-territory-divisions-container class="min-w-64 ${initialDivisionsClass}">
                    ${initialDivisionsHTML}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div data-pinned-location-last-updated-container class="flex items-start gap-x-1 mt-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock text-base-content/70 mt-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p class="text-xs text-base-content/70">
              Last updated at
              <strong data-pinned-location-last-updated-at class="text-base-content text-xs font-normal">
                ${lastUpdatedAtDynamic.dateTime.value ?? ""}
              </strong>
            </p>
          </div>
          <div class="pt-0.5 flex justify-end">
            ${deleteMarkerBtnHTML}
          </div>
        </article>
      `;
      const _markerPopup = new maplibregl.Popup({
        maxWidth: "none",
        offset: isCurrentLocation ? 15 : 36,
      })
        .setHTML(markerPopupHTML);
      markerPopup.value = _markerPopup;

      loadingContainerRef.current = _markerPopup._content.querySelector(
        "[data-adm-territory-loading-container]",
      ) as HTMLDivElement | null;
      errorContainerRef.current = _markerPopup._content.querySelector(
        "[data-adm-territory-error-container]",
      ) as HTMLDivElement | null;
      bodyLoadingContainerRef.current = _markerPopup._content.querySelector(
        "[data-adm-territory-body-loading-container]",
      ) as HTMLDivElement | null;
      bodyErrorContainerRef.current = _markerPopup._content.querySelector(
        "[data-adm-territory-body-error-container]",
      ) as HTMLDivElement | null;
      bodyDivisionsContainerRef.current = _markerPopup._content.querySelector(
        "[data-adm-territory-divisions-container]",
      ) as HTMLUListElement | null;
      titleContainerRef.current = _markerPopup._content.querySelector(
        "[data-pinned-location-popup-title]",
      ) as HTMLSpanElement | null;
      coordinatesFormattedContainerRef.current = _markerPopup._content
        .querySelector(
          "[data-coordinates-formatted]",
        ) as HTMLParagraphElement | null;
      outputFormatSelectRef.current = _markerPopup._content.querySelector(
        "[data-current-location-popup-output-format]",
      ) as HTMLSelectElement | null;

      const coordinatesFormattedElt = coordinatesFormattedContainerRef
        .current as HTMLParagraphElement;

      function getFormattedCoordinates(selectElt: HTMLSelectElement) {
        const format = selectElt.value as GeographicCoordinateOutputFormat;
        const coordinatesEncoded = coordinatesFormattedElt
          .dataset["coordinatesFormatted"] as string;
        const [lng, lat] = coordinatesEncoded.split(",")
          .map(Number) as [number, number];
        const coordinatesFormatted = formatGeographicCoordinates(
          { lng, lat },
          format,
        );
        return coordinatesFormatted;
      }

      const outputFormatSelectElt = outputFormatSelectRef
        .current as HTMLSelectElement;
      outputFormatSelectElt.addEventListener("change", (e) => {
        const coordinatesFormatted = getFormattedCoordinates(
          e.target as HTMLSelectElement,
        );
        coordinatesFormattedElt.innerHTML = coordinatesFormatted;
      });

      const copyToClipboardComponentElt = _markerPopup._content.querySelector(
        `[data-copy-to-clipboard-component="coordinates-formatted"]`,
      ) as HTMLDivElement;
      const copyToClipboardTextElt = copyToClipboardComponentElt.querySelector(
        ".tooltip-content p",
      ) as HTMLParagraphElement;
      const copyToClipboardBtnElt = copyToClipboardComponentElt.querySelector(
        "button",
      ) as HTMLButtonElement;

      copyToClipboardBtnElt.onclick = async () => {
        const coordinatesFormatted = getFormattedCoordinates(
          outputFormatSelectElt,
        );
        await navigator.clipboard.writeText(coordinatesFormatted);
        copyToClipboardTextElt.innerHTML = `
          <span class="flex items-center gap-x-1">
            ${copiedIconSVG}
            Copied!
          </span>
        `;
        copyToClipboardBtnElt.innerHTML = checkIconSVG;
        if (copyToClipboardTextResetterTimeoutRef.current) {
          clearTimeout(copyToClipboardTextResetterTimeoutRef.current);
        }
        copyToClipboardTextResetterTimeoutRef.current = setTimeout(() => {
          copyToClipboardTextElt.innerHTML = "Copy to clipboard";
          copyToClipboardBtnElt.innerHTML = copyIconSVG;
          copyToClipboardTextResetterTimeoutRef.current = null;
        }, 1500);
      };

      const collapseRoot = _markerPopup._content.querySelector(
        "[data-collapse]",
      ) as HTMLDivElement;
      if (collapseRoot) {
        const trigger = collapseRoot.querySelector(
          "[data-collapse-trigger]",
        ) as HTMLButtonElement;
        const panel = collapseRoot.querySelector(
          "[data-collapse-panel]",
        ) as HTMLDivElement;
        const icon = collapseRoot.querySelector(
          "[data-collapse-icon]",
        ) as SVGSVGElement;

        const setOpen = (open: boolean) => {
          collapseRoot.dataset.open = String(open);
          trigger.setAttribute("aria-expanded", String(open));
          panel.style.gridTemplateRows = open ? "1fr" : "0fr";
          if (icon) {
            icon.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
          }
        };

        trigger.addEventListener("click", () => {
          setOpen(collapseRoot.dataset.open !== "true");
        });

        setOpen(collapseRoot.dataset.open === "true");
      }

      const titleEditForm = _markerPopup._content.querySelector(
        "[data-title-edit-form]",
      ) as HTMLFormElement | null;
      let isFormActive = false;
      let updateFormState: (() => void) | null = null;
      if (titleEditForm) {
        const inactiveView = titleEditForm.querySelector(
          "[data-title-edit-inactive-view]",
        ) as HTMLDivElement;
        const activeView = titleEditForm.querySelector(
          "[data-title-edit-active-view]",
        ) as HTMLDivElement;
        const toggleBtn = titleEditForm.querySelector(
          "[data-title-edit-toggle]",
        ) as HTMLButtonElement;
        const cancelBtn = titleEditForm.querySelector(
          "[data-title-edit-cancel]",
        ) as HTMLButtonElement;
        const saveBtn = titleEditForm.querySelector(
          "[data-title-edit-save]",
        ) as HTMLButtonElement;
        const inputElt = titleEditForm.querySelector(
          "[data-title-edit-input]",
        ) as HTMLInputElement;
        const errorElt = titleEditForm.querySelector(
          "[data-title-edit-error]",
        ) as HTMLSpanElement;

        updateFormState = () => {
          if (isFormActive) {
            inactiveView.classList.add("hidden");
            activeView.classList.remove("hidden");
            inputElt.value =
              titleContainerRef.current?.dataset["pinnedLocationPopupTitle"] ||
              "";
            inputElt.dispatchEvent(new Event("input"));
            inputElt.focus();
          } else {
            activeView.classList.add("hidden");
            inactiveView.classList.remove("hidden");
            inputElt.classList.remove("input-error");
            errorElt.classList.add("hidden");
          }
        };

        toggleBtn.addEventListener("click", () => {
          isFormActive = true;
          updateFormState?.();
        });

        cancelBtn.addEventListener("click", () => {
          isFormActive = false;
          updateFormState?.();
        });

        inputElt.addEventListener("input", () => {
          const isEmpty = inputElt.value.trim() === "";
          saveBtn.disabled = isEmpty;
          if (isEmpty) {
            inputElt.classList.add("input-error");
            errorElt.classList.remove("hidden");
          } else {
            inputElt.classList.remove("input-error");
            errorElt.classList.add("hidden");
          }
        });

        titleEditForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const newTitle = inputElt.value.trim();
          if (!newTitle) return;

          if (onTitleEditedRef.current) {
            await onTitleEditedRef.current(newTitle);
          }

          isFormActive = false;
          updateFormState?.();
        });
      }

      const coordsEditForm = _markerPopup._content.querySelector(
        "[data-coordinates-edit-form]",
      ) as HTMLFormElement | null;
      const coordinatesView = _markerPopup._content.querySelector(
        "[data-coordinates-view]",
      ) as HTMLDivElement | null;
      let isCoordsFormActive = false;
      let updateCoordsFormState: (() => void) | null = null;
      if (coordsEditForm) {
        const inactiveCoordsView = coordsEditForm.querySelector(
          "[data-coordinates-edit-inactive-view]",
        ) as HTMLDivElement;
        const activeCoordsView = coordsEditForm.querySelector(
          "[data-coordinates-edit-active-view]",
        ) as HTMLDivElement;
        const toggleCoordsBtn = coordsEditForm.querySelector(
          "[data-coordinates-edit-toggle]",
        ) as HTMLButtonElement;
        const cancelCoordsBtn = coordsEditForm.querySelector(
          "[data-coordinates-edit-cancel]",
        ) as HTMLButtonElement;
        const inputCoordsElt = coordsEditForm.querySelector(
          "[data-coordinates-edit-input]",
        ) as HTMLInputElement;
        const errorCoordsElt = coordsEditForm.querySelector(
          "[data-coordinates-edit-error]",
        ) as HTMLSpanElement;

        updateCoordsFormState = () => {
          if (isCoordsFormActive) {
            inactiveCoordsView.classList.add("hidden");
            activeCoordsView.classList.remove("hidden");
            coordinatesView?.classList.add("hidden");

            const outputFormatSelectElt = outputFormatSelectRef.current;
            const format = outputFormatSelectElt
              ? (outputFormatSelectElt
                .value as GeographicCoordinateOutputFormat)
              : GeographicCoordinateOutputFormat.DecimalDegrees;

            const coordinatesFormattedElt =
              coordinatesFormattedContainerRef.current;
            const coordinatesEncoded = coordinatesFormattedElt
              ?.dataset["coordinatesFormatted"] as string | undefined;
            if (coordinatesEncoded) {
              const [lng, lat] = coordinatesEncoded.split(",").map(Number) as [
                number,
                number,
              ];
              inputCoordsElt.value =
                formatGeographicCoordinates({ lng, lat }, format) || "";
            } else {
              inputCoordsElt.value = "";
            }

            inputCoordsElt.dispatchEvent(new Event("input"));
            inputCoordsElt.focus();
          } else {
            activeCoordsView.classList.add("hidden");
            inactiveCoordsView.classList.remove("hidden");
            coordinatesView?.classList.remove("hidden");
            inputCoordsElt.classList.remove("input-error");
            errorCoordsElt.classList.add("hidden");
          }
        };

        toggleCoordsBtn.addEventListener("click", () => {
          isCoordsFormActive = true;
          updateCoordsFormState?.();
        });

        cancelCoordsBtn.addEventListener("click", () => {
          isCoordsFormActive = false;
          updateCoordsFormState?.();
        });

        inputCoordsElt.addEventListener("input", () => {
          inputCoordsElt.classList.remove("input-error");
          errorCoordsElt.classList.add("hidden");
        });

        coordsEditForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const newVal = inputCoordsElt.value.trim();
          if (!newVal) return;

          try {
            const parsed = convert(newVal, 15);
            if (onCoordinatesEditedRef.current) {
              await onCoordinatesEditedRef.current({
                lat: parsed.decimalLatitude,
                lng: parsed.decimalLongitude,
              });
            }
            isCoordsFormActive = false;
            updateCoordsFormState?.();
          } catch (_err) {
            inputCoordsElt.classList.add("input-error");
            errorCoordsElt.classList.remove("hidden");
          }
        });
      }

      _markerPopup.on("close", () => {
        if (isFormActive) {
          isFormActive = false;
          updateFormState?.();
        }
        if (isCoordsFormActive) {
          isCoordsFormActive = false;
          updateCoordsFormState?.();
        }
      });

      if (!isCurrentLocation) {
        const lockMarkerToggleElt = _markerPopup._content.querySelector(
          "[data-lock-marker-container] input",
        ) as HTMLInputElement;
        lockMarkerToggleRef.current = lockMarkerToggleElt;

        lockMarkerToggleElt.addEventListener("change", (e) => {
          e.preventDefault();
          const isChecked = (e.target as HTMLInputElement).checked;
          onLockMarkerToggledRef.current?.(isChecked);
        });

        const draggableMarkerBadgeSectionElt = _markerPopup._content
          .querySelector(
            "[data-lock-marker-container] [data-draggable-badge]",
          ) as HTMLDivElement;
        draggableMarkerBadgeSectionRef.current = draggableMarkerBadgeSectionElt;
      }

      const deletePinnedLocationBtnElt = _markerPopup._content.querySelector(
        "button[data-pinned-location-delete]",
      );
      deletePinnedLocationBtnElt?.addEventListener("click", () => {
        onDeleteRef.current?.(pinnedLocationEntry.value!.id);
      });
    },
    [pinnedLocationEntry.value],
  );

  function popupCleanup() {
    markerPopup.value?.remove();
    markerPopup.value = null;
    wasCreated.current = false;
    if (copyToClipboardTextResetterTimeoutRef.current) {
      clearTimeout(copyToClipboardTextResetterTimeoutRef.current);
    }
  }

  useEffect(() => {
    if (pinnedLocationEntry.value) {
      return () => {
        popupCleanup();
      };
    }
  }, [pinnedLocationEntry.value?.id]);

  useEffect(() => {
    const popup = markerPopup.value;
    if (!popup || !popup.isOpen()) return;

    const timeElt = popup.getElement()?.querySelector(
      "[data-pinned-location-last-updated-at]",
    );
    if (timeElt) {
      timeElt.textContent = lastUpdatedAtDynamic.dateTime.value;
      if (pinnedLocationEntry.value?.updatedAt) {
        timeElt.setAttribute(
          "title",
          lastUpdatedAtIntlFormatterRef.current.format(
            pinnedLocationEntry.value.updatedAt,
          ),
        );
      }
    }
  }, [
    markerPopup.value,
    lastUpdatedAtDynamic.dateTime.value,
    pinnedLocationEntry.value?.updatedAt,
  ]);

  useEffect(() => {
    if (!markerPopup.value) return;
    const loadingContainer = loadingContainerRef.current;
    if (!loadingContainer) return;

    if (pinnedLocationEntry.value?.isLoadingFokontany) {
      loadingContainer.innerHTML = ADM_TERRITORY_LOADING_HTML;
    } else {
      loadingContainer.innerHTML = "";
    }
  }, [pinnedLocationEntry.value?.isLoadingFokontany, markerPopup.value]);

  useEffect(() => {
    if (!markerPopup.value) return;
    const errorContainer = errorContainerRef.current;
    if (!errorContainer) return;

    if (pinnedLocationEntry.value?.fokontanyErrorCause) {
      errorContainer.innerHTML = ADM_TERRITORY_ERROR_HTML;
    } else {
      errorContainer.innerHTML = "";
    }
  }, [pinnedLocationEntry.value?.fokontanyErrorCause, markerPopup.value]);

  useEffect(() => {
    if (!markerPopup.value) return;
    const bodyLoadingContainer = bodyLoadingContainerRef.current;
    if (!bodyLoadingContainer) return;

    if (
      !pinnedLocationEntry.value?.fokontany &&
      pinnedLocationEntry.value?.isLoadingFokontany
    ) {
      bodyLoadingContainer.innerHTML = ADM_TERRITORY_BODY_LOADING_HTML;
      bodyLoadingContainer.classList.remove("hidden");
      bodyLoadingContainer.classList.add("contents");
    } else {
      bodyLoadingContainer.innerHTML = "";
      bodyLoadingContainer.classList.remove("contents");
      bodyLoadingContainer.classList.add("hidden");
    }
  }, [
    pinnedLocationEntry.value?.isLoadingFokontany,
    pinnedLocationEntry.value?.fokontany,
    markerPopup.value,
  ]);

  useEffect(() => {
    if (!markerPopup.value) return;
    const bodyErrorContainer = bodyErrorContainerRef.current;
    if (!bodyErrorContainer) return;

    if (pinnedLocationEntry.value?.fokontanyErrorCause) {
      bodyErrorContainer.innerHTML = getAdmTerritoryBodyErrorHTML(
        pinnedLocationEntry.value.fokontanyErrorCause,
      );
      bodyErrorContainer.classList.remove("hidden");
      bodyErrorContainer.classList.add("contents");
    } else {
      bodyErrorContainer.innerHTML = "";
      bodyErrorContainer.classList.remove("contents");
      bodyErrorContainer.classList.add("hidden");
    }
  }, [pinnedLocationEntry.value?.fokontanyErrorCause, markerPopup.value]);

  async function handleToggleClick(e: Event) {
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    const levelCode = target.dataset["levelCode"] as AdmLevelCode;
    const isChecked = target.checked;
    await appMapStore.toggleAdmEntityGeoJsonEntryOnMap(
      fokontanyDiscriminated!,
      levelCode,
      isChecked,
    );
  }

  useEffect(() => {
    if (!markerPopup.value) return;
    const bodyDivisionsContainer = bodyDivisionsContainerRef.current;
    if (!bodyDivisionsContainer) return;

    const isLoading = !pinnedLocationEntry.value?.fokontany &&
      pinnedLocationEntry.value?.isLoadingFokontany;
    const isError = !!pinnedLocationEntry.value?.fokontanyErrorCause;
    if (isError || isLoading) {
      bodyDivisionsContainer.innerHTML = "";
      bodyDivisionsContainer.classList.add("hidden");
    } else if (fokontanyDivisions) {
      bodyDivisionsContainer.innerHTML = getFokontanyDivisionsHTML(
        fokontanyDivisions,
        apiStore,
      );
      bodyDivisionsContainer.classList.remove("hidden");
      const togglesElts = bodyDivisionsContainer.querySelectorAll(
        `input[data-level-code]`,
      );
      for (const toggleElt of togglesElts) {
        toggleElt.addEventListener("click", handleToggleClick);
      }
    }
  }, [
    pinnedLocationEntry.value?.isLoadingFokontany,
    pinnedLocationEntry.value?.fokontany,
    pinnedLocationEntry.value?.fokontanyErrorCause,
    fokontanyDivisions,
    markerPopup.value,
  ]);

  useEffect(() => {
    if (!markerPopup.value || isCurrentLocation) return;
    const titleElt = titleContainerRef.current;
    if (!titleElt || !pinnedLocationEntry.value) return;

    const title = pinnedLocationEntry.value.title;
    titleElt.dataset["pinnedLocationPopupTitle"] = title;
    titleElt.innerHTML = title;
  }, [pinnedLocationEntry.value?.title, markerPopup.value, isCurrentLocation]);

  useEffect(() => {
    if (!markerPopup.value) return;
    const coordinatesFormattedElt = coordinatesFormattedContainerRef.current;
    if (!coordinatesFormattedElt || !pinnedLocationEntry.value) return;

    const entry = pinnedLocationEntry.value;
    const markerPopupCoordinatesFormattedDataAttrValue = entry.coordinates.lng +
      "," + entry.coordinates.lat;

    const outputFormatSelectElt = outputFormatSelectRef.current;
    const format = outputFormatSelectElt
      ? (outputFormatSelectElt.value as GeographicCoordinateOutputFormat)
      : GeographicCoordinateOutputFormat.DecimalDegrees;

    const coordinatesFormatted = formatGeographicCoordinates(
      entry.coordinates,
      format,
    );

    coordinatesFormattedElt.dataset["coordinatesFormatted"] =
      markerPopupCoordinatesFormattedDataAttrValue;
    coordinatesFormattedElt.innerHTML = coordinatesFormatted ?? "";
  }, [pinnedLocationEntry.value?.coordinates, markerPopup.value]);

  useEffect(() => {
    if (!markerPopup.value || !fokontanyDivisions) return;
    for (const division of fokontanyDivisions) {
      const input = markerPopup.value._content?.querySelector(
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
  }, [fokontanyDivisions, markerPopup.value]);

  useEffect(
    () => {
      if (
        isCurrentLocation || !markerPopup.value || !pinnedLocationEntry.value
      ) return;
      if (lockMarkerToggleRef.current) {
        lockMarkerToggleRef.current.checked =
          pinnedLocationEntry.value.isLocked;
      }
      if (draggableMarkerBadgeSectionRef.current) {
        draggableMarkerBadgeSectionRef.current.innerHTML =
          !pinnedLocationEntry.value.isLocked
            ? LOCK_MARKER_DRAGGABLE_BADGE_HTML
            : "";
      }
    },
    [pinnedLocationEntry.value?.isLocked, markerPopup.value],
  );

  return {
    markerPopup,
  };
}
