import { bbox as bboxFn } from "@turf/bbox";
import { GeoJSONFeatureCollection, GeoJSONGeometry } from "@scope/types/utils";

export type GeometryCalculationWorkerMessageData = {
  id: string;
  geojson: GeoJSONFeatureCollection<Record<string, unknown>> | GeoJSONGeometry;
};

export type GeometryCalculationWorkerResponseData = {
  id: string;
  bbox: ReturnType<typeof bboxFn>;
};

self.addEventListener("message", (e) => {
  const data = e.data as GeometryCalculationWorkerMessageData;
  const geojson = data.geojson;
  const bbox = bboxFn(geojson);
  const response: GeometryCalculationWorkerResponseData = {
    id: data.id,
    bbox,
  };
  self.postMessage(response);
});
