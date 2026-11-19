import { coordinateSystems, createCoordinate } from "@accelint/geo";
import { GEOLOCATION_COORDINDATE_EPSILON } from "@/config/pinned-locations.config.ts";
import type { PinnedLocationEntry } from "@/stores/pinned-locations.store.ts";
import {
  GeographicCoordinateOutputFormat,
} from "@/consts/pinned-locations.consts.ts";

export function compareGeographicCoordinates(
  coords1: [number, number],
  coords2: [number, number],
): boolean {
  const diff1 = Math.abs(coords1[0] - coords2[0]);
  const diff2 = Math.abs(coords1[1] - coords2[1]);
  const stayedAtTheSamePosition = diff1 < GEOLOCATION_COORDINDATE_EPSILON &&
    diff2 < GEOLOCATION_COORDINDATE_EPSILON;
  return stayedAtTheSamePosition;
}

export interface ShowPinnedLocationEvent extends Event {
  readonly detail: { locationEntryId: number };
}

export class ShowPinnedLocationOnMapEventHub {
  private target = new EventTarget();

  subscribe(listener: (event: ShowPinnedLocationEvent) => void) {
    this.target.addEventListener(
      "show-pinned-location",
      listener as EventListener,
    );
  }

  unsubscribe(listener: (event: ShowPinnedLocationEvent) => void) {
    this.target.removeEventListener(
      "show-pinned-location",
      listener as EventListener,
    );
  }

  dispatch(locationEntryId: number) {
    this.target.dispatchEvent(
      new CustomEvent("show-pinned-location", {
        detail: { locationEntryId },
      }),
    );
  }
}

export const showPinnedLocationOnMapEventHub =
  new ShowPinnedLocationOnMapEventHub();

export function formatGeographicCoordinates(
  coordinates: PinnedLocationEntry["coordinates"],
  format: GeographicCoordinateOutputFormat,
): string {
  const create = createCoordinate(coordinateSystems.dd, "LATLON");
  const coord = create([coordinates.lat, coordinates.lng]);
  switch (format) {
    case GeographicCoordinateOutputFormat.DecimalDegrees:
      return coord.dd();
    case GeographicCoordinateOutputFormat.DegreesDecimalMinutes:
      return coord.ddm();
    case GeographicCoordinateOutputFormat.DegreesMinutesSeconds:
      return coord.dms();
    case GeographicCoordinateOutputFormat.MilitaryGridReferenceSystem:
      return coord.mgrs();
    case GeographicCoordinateOutputFormat.UniversalTransverseMercator:
      return coord.utm();
    default:
      throw new Error(
        `Unsupported geographic coordinate output format ${format} in formatGeographicCoordinates`,
      );
  }
}
