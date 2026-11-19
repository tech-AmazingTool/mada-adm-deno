import { useEffect, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";

import { useStoresContext } from "@/contexts/stores/index.ts";
import { ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT } from "@/consts/app-layout.consts.ts";
import AppMapPinnedLocationsPin from "@/components/shell/AppMapPinnedLocationsPin.tsx";

// deno-lint-ignore ban-types
type MapMouseEvent = maplibregl.MapMouseEvent & Object;

export type AppMapPinnedLocationsProps = {
  map: maplibregl.Map;
};

export default function AppMapPinnedLocations(
  { map }: AppMapPinnedLocationsProps,
) {
  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pointOnMapPayload, pinnedLocations } = pinnedLocationsStore;

  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!pointOnMapPayload.value || markerRef.current) return;

    if (innerWidth < ROUTER_PAGE_DRAWER_STATIC_POSITION_BREAKPOINT) {
      appLayoutStore.toggleSidebar(false);
    }

    const marker = new maplibregl.Marker();
    marker._element.style.pointerEvents = "none";
    map._canvas.style.cursor = "crosshair";
    map._canvas.dataset.cursorMarkerActive = "true";

    marker._element.querySelector("svg")!.style.opacity = "0.6";

    markerRef.current = marker;

    function handleMouseEnter() {
      !marker.getElement().isConnected && marker.addTo(map);
    }
    map.on("mouseover", handleMouseEnter);

    function handleMouseMove(e: MapMouseEvent) {
      marker.setLngLat(e.lngLat);
    }
    map.on("mousemove", handleMouseMove);

    function handleMouseLeave() {
      marker.getElement().isConnected && marker.remove();
    }
    map.on("mouseout", handleMouseLeave);

    function handlePointClick(e: MapMouseEvent) {
      pinnedLocationsStore.addPinnedLocationEntry({
        title: pointOnMapPayload.value?.title ?? "",
        coordinates: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      });
      pointOnMapPayload.value = null;
    }
    map.on("click", handlePointClick);

    return () => {
      markerRef.current = null;
      marker.remove();

      map.off("mouseover", handleMouseEnter);
      map.off("mousemove", handleMouseMove);
      map.off("mouseout", handleMouseLeave);
      map.off("click", handlePointClick);

      map._canvas.style.cursor = "grab";
      map._canvas.dataset.cursorMarkerActive = "false";
    };
  }, [!!pointOnMapPayload.value]);

  return (
    <>
      {pinnedLocations.value.map((entry) => {
        return (
          <AppMapPinnedLocationsPin
            key={entry.id}
            pinnedLocationEntry={entry}
            map={map}
          />
        );
      })}
    </>
  );
}
