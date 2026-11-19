import { computed, signal } from "@preact/signals";
import { DetailedError } from "@hono/hono/client";
import { Fokontany } from "@scope/types/models";
import {
  CURRENT_LOCATION_TRACKING_DURATION_BY_PROFILE,
  CurrentLocationTrackingProfile,
  PinnedLocationErrorCause,
} from "@/consts/pinned-locations.consts.ts";
import { GEOLOCATION_TIMEOUT } from "@/config/pinned-locations.config.ts";
import { FokontanyApi } from "@/api/fokontany.api.ts";
import { compareGeographicCoordinates } from "@/helpers/pinned-locations.helper.ts";
import { ApiStore } from "@/stores/api.store.ts";

export type PinnedLocationEntry = {
  id: number;
  title: string;
  updatedAt: Date;
  coordinates: {
    lat: number;
    lng: number;
  };
  isLocked: boolean;
  isLoadingFokontany: boolean;
  fokontanyErrorCause: PinnedLocationErrorCause | null;
  fokontany: Fokontany | null;
};

export type PinnedLocationPointOnMapPayload = {
  title: string;
};

export type AddPinnedLocationEntryPayload = {
  title: string;
  coordinates: Record<"lng" | "lat", number>;
};

export type PinnedLocationMoveType = "top" | "up" | "down" | "bottom";

export class PinnedLocationsStore {
  constructor(private fokontanyApi: FokontanyApi, private apiStore: ApiStore) {}

  readonly showPanel = signal(false);

  readonly trackingProfileFrequency = signal<CurrentLocationTrackingProfile>(
    CurrentLocationTrackingProfile.Snapshot,
  );
  readonly highAccuracyGeolocationEnabled = signal(false);
  readonly geolocationIsLoading = signal(false);
  readonly geolocationError = signal<GeolocationPositionError | null>(null);
  readonly geolocationErrorMessage = computed<string | null>(() => {
    const error = this.geolocationError.value;
    if (!error) return null;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "User denied the request for Geolocation.";
      case error.POSITION_UNAVAILABLE:
        return "Current location information is unavailable.";
      case error.TIMEOUT:
        return "The request to get the current location timed out.";
      default:
        return "An unknown error occurred.";
    }
  });
  readonly currentLocationEntry = signal<PinnedLocationEntry | null>(
    null,
  );

  private currentLocationTrackingInterval:
    | ReturnType<typeof setInterval>
    | null = null;

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: this.highAccuracyGeolocationEnabled.value,
          timeout: GEOLOCATION_TIMEOUT,
          maximumAge: 0,
        },
      );
    });
  }

  private async loadCurrentLocationFokontany() {
    if (!this.currentLocationEntry.value) return;
    if (this.apiStore.configIsLoaded.value) {
      if (!this.apiStore.config.value) {
        this.currentLocationEntry.value = {
          ...this.currentLocationEntry.value,
          fokontany: null,
          isLoadingFokontany: false,
          fokontanyErrorCause: PinnedLocationErrorCause.UnavailableConfig,
        };
        return;
      } else if (!this.apiStore.config.value.hasGeojson) {
        this.currentLocationEntry.value = {
          ...this.currentLocationEntry.value,
          fokontany: null,
          isLoadingFokontany: false,
          fokontanyErrorCause: PinnedLocationErrorCause.GeoJsonNotSupported,
        };
        return;
      }
    }
    try {
      const fokontany = await this.fokontanyApi
        .getByCoordinates(
          this.currentLocationEntry.value.coordinates.lat,
          this.currentLocationEntry.value.coordinates.lng,
        );
      if (this.currentLocationEntry.value) {
        this.currentLocationEntry.value = {
          ...this.currentLocationEntry.value,
          fokontany,
          isLoadingFokontany: false,
          fokontanyErrorCause: null,
        };
      }
    } catch (error) {
      console.error(error);
      if (this.currentLocationEntry.value) {
        this.currentLocationEntry.value = {
          ...this.currentLocationEntry.value,
          fokontany: null,
          isLoadingFokontany: false,
          fokontanyErrorCause:
            (error instanceof DetailedError && error.statusCode === 404)
              ? PinnedLocationErrorCause.NotFound
              : PinnedLocationErrorCause.Unexpected,
        };
      }
    }
  }

  async loadInitialCurrentLocation(): Promise<boolean> {
    if (this.currentLocationTrackingInterval) {
      clearInterval(this.currentLocationTrackingInterval);
      this.currentLocationTrackingInterval = null;
    }

    this.geolocationIsLoading.value = true;

    let isSuccess = true;

    try {
      const position = await this.getCurrentPosition();
      this.currentLocationEntry.value = {
        id: this.currentLocationEntry.value?.id ?? Date.now(),
        title: "Current location",
        updatedAt: new Date(),
        coordinates: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        isLocked: this.currentLocationEntry.value?.isLocked ?? true,
        isLoadingFokontany: true,
        fokontanyErrorCause:
          this.currentLocationEntry.value?.fokontanyErrorCause ?? null,
        fokontany: this.currentLocationEntry.value?.fokontany ?? null,
      };
      this.geolocationError.value = null;

      this.loadCurrentLocationFokontany();
    } catch (error) {
      console.error(error);
      this.geolocationError.value = error as GeolocationPositionError;
      isSuccess = false;
    } finally {
      this.geolocationIsLoading.value = false;
    }

    return isSuccess;
  }

  initCurrentLocationTracking() {
    if (
      this.trackingProfileFrequency.value !==
        CurrentLocationTrackingProfile.Snapshot
    ) {
      if (this.currentLocationTrackingInterval) {
        clearInterval(this.currentLocationTrackingInterval);
        this.currentLocationTrackingInterval = null;
      }

      const duration = CURRENT_LOCATION_TRACKING_DURATION_BY_PROFILE.get(
        this.trackingProfileFrequency.value,
      )!;
      this.currentLocationTrackingInterval = setInterval(async () => {
        try {
          const position = await this.getCurrentPosition();
          if (this.currentLocationEntry.value) {
            const prevCoords = this.currentLocationEntry.value?.coordinates;

            const isSamePosition = compareGeographicCoordinates(
              [position.coords.latitude, position.coords.longitude],
              [prevCoords.lat, prevCoords.lng],
            );

            this.currentLocationEntry.value = {
              ...this.currentLocationEntry.value,
              id: this.currentLocationEntry.value.id,
              updatedAt: new Date(),
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
              isLoadingFokontany: !isSamePosition,
            };
            this.geolocationError.value = null;

            if (!isSamePosition) {
              await this.loadCurrentLocationFokontany();
            }
          }
        } catch (error) {
          console.error(error);
          this.geolocationError.value = error as GeolocationPositionError;
        }
      }, duration);
    }
  }

  clearCurrentLocationTracking() {
    if (this.currentLocationTrackingInterval) {
      clearInterval(this.currentLocationTrackingInterval);
      this.currentLocationTrackingInterval = null;
    }
    this.currentLocationEntry.value = null;
    this.geolocationError.value = null;
    this.geolocationIsLoading.value = false;
    this.trackingProfileFrequency.value =
      CurrentLocationTrackingProfile.Snapshot;
    this.highAccuracyGeolocationEnabled.value = false;
  }

  readonly pointOnMapPayload = signal<PinnedLocationPointOnMapPayload | null>(
    null,
  );

  readonly pinnedLocations = signal<PinnedLocationEntry[]>([]);

  async loadPinnedLocationFokontany(pinnedLocationId: number) {
    const pinnedLocationIndex = this.pinnedLocations.value.findIndex(
      (p) => p.id === pinnedLocationId,
    );
    if (pinnedLocationIndex === -1) return;

    const pinnedLocation = {
      ...this.pinnedLocations.value[pinnedLocationIndex],
    };

    if (!this.apiStore.config.value) {
      pinnedLocation.isLoadingFokontany = false;
      pinnedLocation.fokontanyErrorCause =
        PinnedLocationErrorCause.UnavailableConfig;
      const pinnedLocations = [...this.pinnedLocations.value];
      pinnedLocations[pinnedLocationIndex] = pinnedLocation;
      this.pinnedLocations.value = pinnedLocations;
      return;
    } else if (!this.apiStore.config.value.hasGeojson) {
      pinnedLocation.isLoadingFokontany = false;
      pinnedLocation.fokontanyErrorCause =
        PinnedLocationErrorCause.GeoJsonNotSupported;
      const pinnedLocations = [...this.pinnedLocations.value];
      pinnedLocations[pinnedLocationIndex] = pinnedLocation;
      this.pinnedLocations.value = pinnedLocations;
      return;
    }

    pinnedLocation.isLoadingFokontany = true;
    const pinnedLocations = [...this.pinnedLocations.value];
    pinnedLocations[pinnedLocationIndex] = pinnedLocation;
    this.pinnedLocations.value = pinnedLocations;

    try {
      const fokontany = await this.fokontanyApi.getByCoordinates(
        pinnedLocation.coordinates.lat,
        pinnedLocation.coordinates.lng,
      );
      const pinnedLocationIndex = this.pinnedLocations.value.findIndex((pl) => {
        return pl.id === pinnedLocationId;
      });
      if (pinnedLocationIndex >= 0) {
        const pinnedLocations = [...this.pinnedLocations.value];
        pinnedLocations[pinnedLocationIndex] = {
          ...this.pinnedLocations.value[pinnedLocationIndex],
          fokontany: fokontany,
          isLoadingFokontany: false,
          fokontanyErrorCause: null,
        };
        this.pinnedLocations.value = pinnedLocations;
      }
    } catch (e) {
      console.error(e);
      const pinnedLocationIndex = this.pinnedLocations.value.findIndex((pl) => {
        return pl.id === pinnedLocationId;
      });
      if (pinnedLocationIndex >= 0) {
        const pinnedLocations = [...this.pinnedLocations.value];
        pinnedLocations[pinnedLocationIndex] = {
          ...this.pinnedLocations.value[pinnedLocationIndex],
          fokontany: null,
          isLoadingFokontany: false,
          fokontanyErrorCause:
            (e instanceof DetailedError && e.statusCode === 404)
              ? PinnedLocationErrorCause.NotFound
              : PinnedLocationErrorCause.Unexpected,
        };
        this.pinnedLocations.value = pinnedLocations;
      }
    }
  }

  addPinnedLocationEntry(payload: AddPinnedLocationEntryPayload) {
    const entry: PinnedLocationEntry = {
      id: Date.now(),
      title: payload.title,
      updatedAt: new Date(),
      coordinates: {
        lat: payload.coordinates.lat,
        lng: payload.coordinates.lng,
      },
      isLocked: true,
      isLoadingFokontany: true,
      fokontanyErrorCause: null,
      fokontany: null,
    };
    this.pinnedLocations.value = [entry, ...this.pinnedLocations.value];
  }

  updatePinnedLocationEntryTitle(entryId: number, title: string) {
    const pinnedLocationIndex = this.pinnedLocations.value.findIndex(
      (p) => p.id === entryId,
    );
    if (pinnedLocationIndex === -1) return;
    const pinnedLocations = [...this.pinnedLocations.value];
    pinnedLocations[pinnedLocationIndex] = {
      ...this.pinnedLocations.value[pinnedLocationIndex],
      title,
    };
    this.pinnedLocations.value = pinnedLocations;
  }

  updatePinnedLocationCoordinates(
    entryId: number,
    coordinates: { lat: number; lng: number },
  ) {
    const pinnedLocationIndex = this.pinnedLocations.value.findIndex(
      (p) => p.id === entryId,
    );
    if (pinnedLocationIndex === -1) return;
    const pinnedLocations = [...this.pinnedLocations.value];
    pinnedLocations[pinnedLocationIndex] = {
      ...this.pinnedLocations.value[pinnedLocationIndex],
      coordinates,
      updatedAt: new Date(),
    };
    this.pinnedLocations.value = pinnedLocations;
  }

  updatePinnedLocationIsLocked(entryId: number, isLocked: boolean) {
    const pinnedLocationIndex = this.pinnedLocations.value.findIndex(
      (p) => p.id === entryId,
    );
    if (pinnedLocationIndex === -1) return;
    const pinnedLocations = [...this.pinnedLocations.value];
    pinnedLocations[pinnedLocationIndex] = {
      ...this.pinnedLocations.value[pinnedLocationIndex],
      isLocked,
    };
    this.pinnedLocations.value = pinnedLocations;
  }

  deletePinnedLocation(entryId: number) {
    this.pinnedLocations.value = this.pinnedLocations.value.filter(
      (p) => p.id !== entryId,
    );
  }

  movePinnedLocationListItem(
    entryId: number,
    moveTypeOrIndex: PinnedLocationMoveType | number,
  ) {
    const pinnedLocations = [...this.pinnedLocations.value];
    const index = pinnedLocations.findIndex((p) => p.id === entryId);
    if (index === -1) return;

    const [item] = pinnedLocations.splice(index, 1);

    if (typeof moveTypeOrIndex === "number") {
      pinnedLocations.splice(moveTypeOrIndex, 0, item);
    } else if (moveTypeOrIndex === "top") {
      pinnedLocations.unshift(item);
    } else if (moveTypeOrIndex === "up") {
      const newIndex = Math.max(0, index - 1);
      pinnedLocations.splice(newIndex, 0, item);
    } else if (moveTypeOrIndex === "down") {
      const newIndex = Math.min(pinnedLocations.length, index + 1);
      pinnedLocations.splice(newIndex, 0, item);
    } else if (moveTypeOrIndex === "bottom") {
      pinnedLocations.push(item);
    }

    this.pinnedLocations.value = pinnedLocations;
  }
}

let _instance: PinnedLocationsStore | null = null;

export function injectPinnedLocationsStore(
  fokontanyApi: FokontanyApi,
  apiStore: ApiStore,
): PinnedLocationsStore {
  return _instance ??= new PinnedLocationsStore(fokontanyApi, apiStore);
}
