import { useEffect, useMemo, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import maplibregl from "maplibre-gl";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { PinnedLocationEntry } from "@/stores/pinned-locations.store.ts";
import { AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";
import { PINNED_LOCATION_FOCUS_ZOOM } from "@/consts/pinned-locations.consts.ts";
import useAddPinnedLocationMarkerPopup from "@/hooks/useAddPinnedLocationMarkerPopup.ts";
import { AdmLevelCode } from "@scope/consts/models";
import { AdmEntityDiscriminated } from "@scope/types/models";
import useValueToSignal from "@/hooks/useValueToSignal.ts";
import {
  ShowPinnedLocationEvent,
  showPinnedLocationOnMapEventHub,
} from "@/helpers/pinned-locations.helper.ts";
import { ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT } from "@/consts/app-layout.consts.ts";

import AppMapPinnedLocationBeaconAdmTerritoryDivision from "@/components/shell/AppMapPinnedLocationAdmTerritoryDivision.tsx";

const PIN_UNLOCKED_ICON_HTML = `
  <div data-pin-unlocked-icon>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-icon lucide-move"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>
  </div>
`;

export type AppMapPinnedLocationsPinProps = {
  pinnedLocationEntry: PinnedLocationEntry;
  map: maplibregl.Map;
};

export default function AppMapPinnedLocationsPin(
  { pinnedLocationEntry, map }: AppMapPinnedLocationsPinProps,
) {
  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  const { injectApiStore, injectAppMapStore } = useStoresContext();

  const apiStore = injectApiStore();

  const appMapStore = injectAppMapStore();

  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();

  const pinnedLocationEntrySignal = useValueToSignal<PinnedLocationEntry>(
    pinnedLocationEntry,
  );

  const pinMarker = useSignal<maplibregl.Marker | null>(null);

  const labelPopupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(
    () => {
      if (!pinnedLocationEntry) return;

      const coords = [
        pinnedLocationEntry.coordinates.lng,
        pinnedLocationEntry.coordinates.lat,
      ] as [number, number];
      const marker = new maplibregl.Marker()
        .setLngLat(coords)
        .addTo(map);
      marker._element.style.cursor = "pointer";

      const pinUnlockedIconSectionHTML = !pinnedLocationEntry.isLocked
        ? PIN_UNLOCKED_ICON_HTML
        : "";

      const labelPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: "bottom",
        offset: 36,
      })
        .setLngLat(coords)
        .setHTML(`
          <div class="flex items-start gap-x-2">
            <h6 data-label-popup-title class="text-xs font-bold">
              ${pinnedLocationEntry.title}
            </h6>
            ${pinUnlockedIconSectionHTML}
          </div>
        `);
      labelPopup._content.style.padding = "0.375rem 0.5rem";
      labelPopupRef.current = labelPopup;

      marker._element.addEventListener("mouseenter", () => {
        !markerPopup.value?.isOpen() && labelPopup.addTo(map);
      });
      marker._element.addEventListener("mouseleave", () => {
        labelPopup.remove();
      });
      marker._element.addEventListener("click", (e) => {
        e.stopPropagation();
        marker.togglePopup();
      });

      marker.on("drag", () => {
        labelPopup.setLngLat(marker.getLngLat());
      });

      marker.on("dragend", () => {
        const coords = marker.getLngLat();
        pinnedLocationsStore.updatePinnedLocationCoordinates(
          pinnedLocationEntry.id,
          { lng: coords.lng, lat: coords.lat },
        );
      });

      if (map.getZoom() < PINNED_LOCATION_FOCUS_ZOOM) {
        map.flyTo({
          center: marker.getLngLat(),
          zoom: PINNED_LOCATION_FOCUS_ZOOM,
        });
      } else {
        map.panTo(marker.getLngLat());
      }

      pinMarker.value = marker;

      return () => {
        labelPopup.remove();
        marker.remove();
        pinMarker.value = null;
      };
    },
    [!!pinnedLocationEntry],
  );

  useEffect(
    () => {
      if (!labelPopupRef.current) return;
      const titleElt = labelPopupRef.current._content.querySelector(
        "[data-label-popup-title]",
      )!;
      titleElt.innerHTML = pinnedLocationEntry.title;
    },
    [pinnedLocationEntry.title],
  );

  useEffect(
    () => {
      const coords = [
        pinnedLocationEntry.coordinates.lng,
        pinnedLocationEntry.coordinates.lat,
      ] as [number, number];
      pinMarker.value?.setLngLat(coords);
      labelPopupRef.current?.setLngLat(coords);

      pinnedLocationsStore.loadPinnedLocationFokontany(pinnedLocationEntry.id);
    },
    [
      pinnedLocationEntry.coordinates.lng,
      pinnedLocationEntry.coordinates.lat,
      !!pinMarker.value,
    ],
  );

  const fokontanyDiscriminated = useMemo<AdmEntityDiscriminated | null>(() => {
    return pinnedLocationEntry.fokontany
      ? {
        admLevelCode: AdmLevelCode.FOKONTANY,
        entity: pinnedLocationEntry.fokontany,
      }
      : null;
  }, [pinnedLocationEntry.fokontany?.id]);
  const fokontanyDivisions = useMemo<AdmEntityDivisionWithEntry[] | null>(
    () => {
      return pinnedLocationEntry.fokontany
        ? appMapStore.breakAdmAttributesDiscriminatedDivisionsWithEntry(
          fokontanyDiscriminated!,
        )
        : null;
    },
    [
      fokontanyDiscriminated,
      pinnedLocationEntry.fokontany?.id,
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

  const { markerPopup } = useAddPinnedLocationMarkerPopup(
    pinnedLocationEntrySignal,
    { fokontanyDiscriminated, fokontanyDivisions },
    {
      isCurrentLocation: false,
      onTitleEdited(newTitle) {
        pinnedLocationsStore.updatePinnedLocationEntryTitle(
          pinnedLocationEntrySignal.value.id,
          newTitle,
        );
      },
      onCoordinatesEdited(newCoords) {
        pinnedLocationsStore.updatePinnedLocationCoordinates(
          pinnedLocationEntrySignal.value.id,
          newCoords,
        );
        map.flyTo({
          center: [newCoords.lng, newCoords.lat],
          zoom: PINNED_LOCATION_FOCUS_ZOOM,
        });
      },
      onLockMarkerToggled(isLocked) {
        pinnedLocationsStore.updatePinnedLocationIsLocked(
          pinnedLocationEntrySignal.value.id,
          isLocked,
        );
      },
      onDelete(id) {
        pinnedLocationsStore.deletePinnedLocation(id);
      },
    },
  );

  useEffect(
    () => {
      if (!markerPopup.value || !pinMarker.value) return;

      pinMarker.value.setPopup(markerPopup.value);

      markerPopup.value.on("open", () => {
        labelPopupRef.current?.remove();
      });

      if (!markerPopup.value.isOpen()) {
        pinMarker.value?.togglePopup();
      }
    },
    [!!markerPopup.value, !!pinMarker.value],
  );

  function handleShowPinnedLocationOnMap(e: ShowPinnedLocationEvent) {
    if (pinnedLocationEntrySignal.value?.id === e.detail.locationEntryId) {
      if (innerWidth < ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT) {
        appLayoutStore.toggleSidebar(false);
      }

      map.panTo([
        pinnedLocationEntrySignal.value.coordinates.lng,
        pinnedLocationEntrySignal.value.coordinates.lat,
      ]);

      if (!pinMarker.value?._popup?.isOpen()) {
        pinMarker.value?.togglePopup();
      }
    }
  }

  useEffect(() => {
    showPinnedLocationOnMapEventHub.subscribe(handleShowPinnedLocationOnMap);
    return () => {
      showPinnedLocationOnMapEventHub.unsubscribe(
        handleShowPinnedLocationOnMap,
      );
    };
  }, []);

  useEffect(
    () => {
      pinMarker.value?.setDraggable(!pinnedLocationEntry.isLocked);
      const iconContent = labelPopupRef.current
        ?._content
        ?.querySelector("[data-pin-unlocked-icon]");
      if (!pinnedLocationEntry.isLocked) {
        if (labelPopupRef.current && !iconContent) {
          const template = document.createElement("template");
          template.innerHTML = PIN_UNLOCKED_ICON_HTML;
          labelPopupRef.current
            ._content
            .firstElementChild!
            .appendChild(template.content.firstElementChild!);
        }
      } else {
        iconContent?.remove();
      }
      if (pinMarker.value) {
        pinMarker.value._element.querySelector("svg")!.style.opacity =
          pinnedLocationEntry.isLocked ? "1" : "0.6";
        pinMarker.value._element.style.cursor = pinnedLocationEntry.isLocked
          ? "pointer"
          : "move";
      }
    },
    [pinnedLocationEntry.isLocked, pinMarker.value, labelPopupRef.current],
  );

  return (
    <>
      {renderedFokontanyDivisions.map((d) => (
        <AppMapPinnedLocationBeaconAdmTerritoryDivision
          key={d.name}
          division={d}
        />
      ))}
    </>
  );
}
