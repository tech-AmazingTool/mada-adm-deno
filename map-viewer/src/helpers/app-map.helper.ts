import maplibregl, { type LngLatBoundsLike, type Map } from "maplibre-gl";
import { GeoJSONFeatureCollection, GeoJSONGeometry } from "@scope/types/utils";
import type {
  GeometryCalculationWorkerMessageData,
  GeometryCalculationWorkerResponseData,
} from "./workers/geometry-bbox-calculator.worker.ts";
import { AdmLevelCode } from "@scope/consts/models";

type MapMouseEvent =
  & maplibregl.MapMouseEvent
  & {
    features?: maplibregl.MapGeoJSONFeature[];
  }
  // deno-lint-ignore ban-types
  & Object;

export type AddGeoJsonLayerToMapOptions = {
  source: string;
  sentinelLayerId: string;
  color: string;
  layerId: string;
  outlineLayerId: string;
  renderPopupHTML: (features?: maplibregl.MapGeoJSONFeature[]) => string;
  onPopup?: (popup: maplibregl.Popup) => void;
  onPopupRemoved?: (popup: maplibregl.Popup) => void;
};

export function addGeoJsonLayerToMap(
  map: maplibregl.Map,
  geojson: GeoJSONFeatureCollection<Record<string, unknown>> | GeoJSONGeometry,
  options: AddGeoJsonLayerToMapOptions,
): () => void {
  const {
    source,
    sentinelLayerId,
    color,
    layerId,
    outlineLayerId,
    renderPopupHTML,
    onPopup,
    onPopupRemoved,
  } = options;
  map.addSource(source, {
    type: "geojson",
    data: geojson,
    generateId: true,
  });

  map.addLayer({
    id: layerId,
    type: "fill",
    source,
    paint: {
      "fill-color": color,
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.4,
        0.2,
      ],
    },
  }, sentinelLayerId);

  let hoveredId: number | null = null;
  let hoveredLayerId: string | null = null;
  let isGrabbing = false;

  function handleMouseDown() {
    isGrabbing = true;
    map.getCanvas().style.cursor = "grabbing";
  }
  map.on("mousedown", handleMouseDown);

  function handleMouseUp() {
    isGrabbing = false;
    const canvas = map.getCanvas();
    canvas.style.cursor = canvas.dataset.cursorMarkerActive === "true"
      ? "crosshair"
      : (hoveredId ? "pointer" : "grab");
  }
  map.on("mouseup", handleMouseUp);

  function handleMouseMove(e: MapMouseEvent) {
    hoveredLayerId = e.features![0].layer.id;
    const canvas = map.getCanvas();
    const hoverCursor = canvas.dataset.cursorMarkerActive === "true"
      ? "crosshair"
      : "pointer";
    if (getComputedStyle(canvas).cursor !== hoverCursor) {
      canvas.style.cursor = hoverCursor;
    }
    if (hoveredId !== null) {
      map.setFeatureState({ source, id: hoveredId }, {
        hover: false,
      });
    }
    hoveredId = e.features![0].id as number;
    if (hoveredLayerId === layerId) {
      map.setFeatureState({ source, id: hoveredId }, {
        hover: true,
      });
    }
  }
  map.on("mousemove", layerId, handleMouseMove);

  function handleMouseEnter() {
    if (isGrabbing) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = canvas.dataset.cursorMarkerActive === "true"
      ? "crosshair"
      : "pointer";
  }
  map.on("mouseenter", layerId, handleMouseEnter);

  function handleMouseLeave() {
    if (hoveredId !== null) {
      map.setFeatureState({ source, id: hoveredId }, {
        hover: false,
      });
    }
    hoveredId = null;
    if (isGrabbing) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = canvas.dataset.cursorMarkerActive === "true"
      ? "crosshair"
      : "grab";
  }
  map.on("mouseleave", layerId, handleMouseLeave);

  let activePopup: maplibregl.Popup | null = null;
  function handleMapClick(event: MapMouseEvent) {
    if (
      event.originalEvent.defaultPrevented ||
      map.getCanvas().dataset.cursorMarkerActive === "true"
    ) return;
    const features = map.queryRenderedFeatures(event.point);
    if (features.length > 0 && features[0].layer.id !== layerId) return;
    event.originalEvent.preventDefault();
    if (activePopup) {
      activePopup.remove();
    }
    const popupHTML = renderPopupHTML(event.features);
    activePopup = new maplibregl.Popup({ maxWidth: "none" })
      .setLngLat(event.lngLat)
      .setHTML(popupHTML)
      .addTo(map);
    onPopup?.(activePopup);
    activePopup.on("close", () => {
      activePopup && onPopupRemoved?.(activePopup);
    });
  }
  map.on("click", layerId, handleMapClick);

  map.addLayer({
    id: outlineLayerId,
    type: "line",
    source,
    paint: {
      "line-color": color,
      "line-width": 2,
    },
  }, layerId);

  return () => {
    map.off("mousedown", handleMouseDown);
    map.off("mouseup", handleMouseUp);
    map.off("mousemove", handleMouseMove);
    map.off("mouseenter", handleMouseEnter);
    map.off("mouseleave", handleMouseLeave);
    map.off("click", layerId, handleMapClick);
    activePopup?.remove();
  };
}

export async function calculateGeoJsonBbox(
  geojson: GeoJSONFeatureCollection<Record<string, unknown>> | GeoJSONGeometry,
): Promise<LngLatBoundsLike> {
  const worker = new Worker(
    new URL(
      "./workers/geometry-bbox-calculator.worker.ts",
      import.meta.url,
    ),
    { type: "module" },
  );
  const id = Date.now().toString();
  const data: GeometryCalculationWorkerMessageData = {
    id,
    geojson,
  };
  worker.postMessage(data);
  const bbox = await new Promise<
    GeometryCalculationWorkerResponseData["bbox"]
  >((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Geometry calculation timeout"));
    }, 20_000);
    worker.onmessage = (e) => {
      const response = e.data as GeometryCalculationWorkerResponseData;
      if (response.id === data.id) {
        clearTimeout(timeout);
        resolve(response.bbox);
      }
    };
  });
  return bbox as maplibregl.LngLatBoundsLike;
}

export async function fitGeoJsonBboxIntoMap(
  map: Map,
  geojson: GeoJSONFeatureCollection<Record<string, unknown>> | GeoJSONGeometry,
): Promise<void> {
  const bbox = await calculateGeoJsonBbox(geojson);
  map.fitBounds(bbox as maplibregl.LngLatBoundsLike, {
    padding: 25,
    duration: 1000,
  });
}

export function getDynamicAdmGeoJsonSource(
  admLevelCode: AdmLevelCode,
  name: string,
): string {
  return `dynamic-adm-geojson-source-${admLevelCode}-${name}`;
}

export function getDynamicAdmGeoJsonLayerId(
  admLevelCode: AdmLevelCode,
  name: string,
): string {
  return `dynamic-adm-geojson-layer-${admLevelCode}-${name}`;
}

export function getDynamicAdmGeoJsonOutlineLayerId(
  admLevelCode: AdmLevelCode,
  name: string,
): string {
  return `dynamic-adm-geojson-outline-layer-${admLevelCode}-${name}`;
}
