import { useEffect, useMemo, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";
import { AdmEntityDiscriminated, EntityId } from "@scope/types/models";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";
import useAddPinnedLocationMarkerPopup from "@/hooks/useAddPinnedLocationMarkerPopup.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";
import AppMapPinnedLocationAdmTerritoryDivision from "@/components/shell/AppMapPinnedLocationAdmTerritoryDivision.tsx";
import { PINNED_LOCATION_FOCUS_ZOOM } from "@/consts/pinned-locations.consts.ts";
import {
  ShowPinnedLocationEvent,
  showPinnedLocationOnMapEventHub,
} from "@/helpers/pinned-locations.helper.ts";
import { ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT } from "@/consts/app-layout.consts.ts";

export type AppMapCurrentLocationBeaconProps = {
  map: maplibregl.Map;
};

export default function AppMapCurrentLocationBeacon(
  { map }: AppMapCurrentLocationBeaconProps,
) {
  const { injectApiStore, injectAppMapStore, injectPinnedLocationsStore } =
    useStoresContext();

  const apiStore = injectApiStore();

  const appMapStore = injectAppMapStore();

  const pinnedLocationsStore = injectPinnedLocationsStore();
  const {
    currentLocationEntry,
    highAccuracyGeolocationEnabled,
    trackingProfileFrequency,
  } = pinnedLocationsStore;

  const beaconElementRef = useRef<HTMLDivElement>(null);

  const labelPopupRef = useRef<maplibregl.Popup>(null);

  useEffect(() => {
    const entry = currentLocationEntry.value;

    if (entry) {
      const labelPopupHTML = document.createElement("div");
      labelPopupHTML.innerHTML = "You are here";
      labelPopupHTML.className = "text-xs px-2 py-1 text-primary font-bold";
      const labelPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        anchor: "bottom",
        offset: 12,
      })
        .setDOMContent(labelPopupHTML)
        .setLngLat([entry.coordinates.lng, entry.coordinates.lat]);
      labelPopupRef.current = labelPopup;

      if (labelPopupHTML.parentElement) {
        labelPopupHTML.parentElement.style.padding = "0";
      }

      return () => {
        labelPopup.remove();
        labelPopupRef.current = null;
      };
    }
  }, [currentLocationEntry.value?.id]);

  const markerRef = useRef<maplibregl.Marker>(null);

  useEffect(() => {
    const coordinates = currentLocationEntry.value?.coordinates;
    if (coordinates) {
      const coords = [coordinates.lng, coordinates.lat];
      labelPopupRef.current?.setLngLat(coords as [number, number]);
      markerRef.current?.setLngLat(coords as [number, number]);
    }
  }, [currentLocationEntry.value?.coordinates]);

  const fokontanyDiscriminated = useMemo<AdmEntityDiscriminated | null>(() => {
    return currentLocationEntry.value?.fokontany
      ? {
        admLevelCode: AdmLevelCode.FOKONTANY,
        entity: currentLocationEntry.value?.fokontany,
      }
      : null;
  }, [currentLocationEntry.value?.fokontany]);
  const fokontanyDivisions = useMemo<AdmEntityDivisionWithEntry[] | null>(
    () => {
      return currentLocationEntry.value?.fokontany
        ? appMapStore.breakAdmAttributesDiscriminatedDivisionsWithEntry(
          fokontanyDiscriminated!,
        )
        : null;
    },
    [
      fokontanyDiscriminated,
      currentLocationEntry.value?.fokontany,
      apiStore.initialAdmEntitiesAreLoaded.value,
      appMapStore.provinceGeoJsonEntryByName.value,
      appMapStore.regionGeoJsonEntryByName.value,
      appMapStore.districtGeoJsonEntryByName.value,
      appMapStore.communeGeoJsonEntryByName.value,
      appMapStore.fokontanyGeoJsonEntryByName.value,
    ],
  );
  const renderedFokontanyDivisions = useMemo<AdmEntityDivisionWithEntry[]>(
    () => fokontanyDivisions?.filter((d) => d.isRendered) ?? [],
    [fokontanyDivisions],
  );

  const prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot = useRef<
    { fokontanyId: EntityId | null; renderedCodes: AdmLevelCode[] }
  >({
    fokontanyId: currentLocationEntry.value?.fokontany?.id ?? null,
    renderedCodes: renderedFokontanyDivisions.map((d) => d.admLevelCode),
  });

  useEffect(
    () => {
      const renderedDivisionsCodes = renderedFokontanyDivisions.map((d) =>
        d.admLevelCode
      );
      for (const code of renderedDivisionsCodes) {
        if (
          !prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
            .renderedCodes
            .includes(code)
        ) {
          prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
            .renderedCodes
            .push(code);
        }
      }
      if (fokontanyDiscriminated) {
        const currentNonRenderedCodes = ADM_LEVEL_CODES_INDEXED
          .filter((code) => {
            return !renderedDivisionsCodes.includes(code) &&
              prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
                .renderedCodes
                .includes(code);
          });
        if (
          fokontanyDiscriminated.entity.id !==
            prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
              .fokontanyId
        ) {
          for (const code of currentNonRenderedCodes) {
            appMapStore.toggleAdmEntityGeoJsonEntryOnMap(
              fokontanyDiscriminated,
              code,
              true,
              false,
              false,
            );
          }
        } else {
          prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
            .renderedCodes =
              prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
                .renderedCodes.filter((code) =>
                  !currentNonRenderedCodes.includes(code)
                );
        }
      }
      prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current
        .fokontanyId = fokontanyDiscriminated?.entity.id ?? null;
    },
    [renderedFokontanyDivisions],
  );

  useEffect(
    () => {
      if (currentLocationEntry.value?.fokontany) {
        prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current = {
          fokontanyId: currentLocationEntry.value.fokontany.id ?? null,
          renderedCodes: renderedFokontanyDivisions.map((d) => d.admLevelCode),
        };
        return () => {
          prevFokontanyIdAndRenderedDivisionsAdmLevelCodesSnapshot.current = {
            fokontanyId: null,
            renderedCodes: [],
          };
        };
      }
    },
    [!!currentLocationEntry.value?.fokontany],
  );

  const { markerPopup } = useAddPinnedLocationMarkerPopup(
    currentLocationEntry,
    { fokontanyDiscriminated, fokontanyDivisions },
    {
      isCurrentLocation: true,
      onDelete() {
        pinnedLocationsStore.clearCurrentLocationTracking();
      },
    },
  );

  useEffect(() => {
    const popup = markerPopup.value;
    const entry = currentLocationEntry.value;

    if (entry && popup) {
      const beaconElement = beaconElementRef.current!.cloneNode(
        true,
      ) as HTMLDivElement;
      beaconElement.classList.remove("hidden");

      beaconElement.addEventListener("mouseenter", () => {
        !popup.isOpen() && labelPopupRef.current?.addTo(map);
      });
      beaconElement.addEventListener("mouseleave", () => {
        labelPopupRef.current?.remove();
      });

      popup.on("open", () => {
        labelPopupRef.current?.remove();
      });

      const marker = new maplibregl.Marker({
        element: beaconElement,
      })
        .setLngLat([entry.coordinates.lng, entry.coordinates.lat])
        .setPopup(popup)
        .addTo(map);

      marker._element.addEventListener("click", (e) => {
        e.stopPropagation();
        marker.togglePopup();
      });

      if (!marker?._popup?.isOpen()) {
        marker?.togglePopup();
      }

      markerRef.current = marker;

      return () => {
        marker.remove();
        markerRef.current = null;
      };
    }
  }, [currentLocationEntry.value?.id, markerPopup.value]);

  const isTrackingParamsFirstUpdate = useRef(true);

  useEffect(
    () => {
      if (!currentLocationEntry.value) return;
      if (isTrackingParamsFirstUpdate.current) {
        isTrackingParamsFirstUpdate.current = false;
        pinnedLocationsStore.initCurrentLocationTracking();
        return;
      }
      pinnedLocationsStore.loadInitialCurrentLocation()
        .then(() => {
          pinnedLocationsStore.initCurrentLocationTracking();
        })
        .catch((error) => {
          console.error(error);
        });
    },
    [
      currentLocationEntry.value?.id,
      highAccuracyGeolocationEnabled.value,
      trackingProfileFrequency.value,
    ],
  );

  function handleCurrentLocationMapFocus(e: ShowPinnedLocationEvent) {
    if (
      currentLocationEntry.value &&
      currentLocationEntry.value.id === e.detail.locationEntryId
    ) {
      if (innerWidth < ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT) {
        appLayoutStore.toggleSidebar(false);
      }

      map.panTo([
        currentLocationEntry.value.coordinates.lng,
        currentLocationEntry.value.coordinates.lat,
      ]);

      if (!markerRef.current?._popup?.isOpen()) {
        markerRef.current?.togglePopup();
      }
    }
  }

  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  useEffect(() => {
    if (currentLocationEntry.value) {
      if (innerWidth < ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT) {
        appLayoutStore.toggleSidebar(false);
      }

      if (map.getZoom() < PINNED_LOCATION_FOCUS_ZOOM) {
        map.flyTo({
          center: [
            currentLocationEntry.value.coordinates.lng,
            currentLocationEntry.value.coordinates.lat,
          ],
          zoom: PINNED_LOCATION_FOCUS_ZOOM,
        });
      } else {
        map.panTo([
          currentLocationEntry.value.coordinates.lng,
          currentLocationEntry.value.coordinates.lat,
        ]);
      }

      showPinnedLocationOnMapEventHub.subscribe(handleCurrentLocationMapFocus);

      return () => {
        pinnedLocationsStore.clearCurrentLocationTracking();
        isTrackingParamsFirstUpdate.current = true;

        showPinnedLocationOnMapEventHub.unsubscribe(
          handleCurrentLocationMapFocus,
        );
      };
    }
  }, [currentLocationEntry.value?.id]);

  return (
    <>
      <div ref={beaconElementRef} class="hidden relative w-fit h-fit">
        <div class="absolute animate-ping rounded-full bg-red-700/75 opacity-75 size-full">
        </div>
        <div class="size-5 bg-red-700 [clip-path:circle(50%)] relative cursor-pointer">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3/5 bg-white [clip-path:circle(50%)]">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1/2 bg-red-700 [clip-path:circle(50%)]">
            </div>
          </div>
        </div>
      </div>
      {renderedFokontanyDivisions.map((d) => (
        <AppMapPinnedLocationAdmTerritoryDivision
          key={d.name}
          division={d}
        />
      ))}
    </>
  );
}
