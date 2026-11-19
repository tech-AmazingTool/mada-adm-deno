import { useRef } from "preact/hooks";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { ClockIcon, LocateOffIcon, MapPinnedIcon } from "lucide-preact";
import {
  CurrentLocationTrackingProfile,
  GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS,
  GeographicCoordinateOutputFormat,
  TRACKING_PROFILE_FREQUENCY_OPTIONS,
} from "@/consts/pinned-locations.consts.ts";
import CopyToClipboardBtn from "@/components/shared/CopyToClipboardBtn.tsx";
import useDynamicDateTime from "@/hooks/useDynamicDateTime.ts";
import LocationTargetIcon from "@/components/icons/LocationTargetIcon.tsx";
import PinsPagePinnedLocationCardFokontany from "@/pages/PinsPagePinnedLocationCardFokontany.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

import {
  formatGeographicCoordinates,
  showPinnedLocationOnMapEventHub,
} from "@/helpers/pinned-locations.helper.ts";

export default function PinsPageCurrentLocationCard() {
  const outputFormat = useSignal<GeographicCoordinateOutputFormat>(
    GeographicCoordinateOutputFormat.DecimalDegrees,
  );

  function handleOutputFormatChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    outputFormat.value = target.value as GeographicCoordinateOutputFormat;
  }

  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const {
    currentLocationEntry,
    trackingProfileFrequency,
    highAccuracyGeolocationEnabled,
  } = pinnedLocationsStore;

  const coordinatesFormatted = useComputed<string | null>(() => {
    return currentLocationEntry.value
      ? formatGeographicCoordinates(
        currentLocationEntry.value.coordinates,
        outputFormat.value,
      )
      : null;
  });

  function handleTrackingModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    trackingProfileFrequency.value = target
      .value as CurrentLocationTrackingProfile;
  }

  function handleHighAccuracyGeolocationChange(event: Event) {
    const target = event.target as HTMLInputElement;
    highAccuracyGeolocationEnabled.value = target.checked;
  }

  const lastUpdatedAtDynamic = useDynamicDateTime(
    currentLocationEntry.value?.updatedAt,
  );

  useSignalEffect(() => {
    if (currentLocationEntry.value) {
      lastUpdatedAtDynamic.start(currentLocationEntry.value.updatedAt);
    } else {
      lastUpdatedAtDynamic.clear();
    }
  });

  const lastUpdatedAtIntlFormatterRef = useRef<Intl.DateTimeFormat>(
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  );

  const fullLastUpdateAtFormatted = useComputed<string | null>(() => {
    const date = currentLocationEntry.value?.updatedAt;
    if (!date) return null;
    return lastUpdatedAtIntlFormatterRef.current.format(date);
  });

  function handleShowOnMapClick() {
    currentLocationEntry.value?.id &&
      showPinnedLocationOnMapEventHub.dispatch(currentLocationEntry.value.id);
  }

  return !!currentLocationEntry.value && (
    <article class="shadow shadow-base-content/30 hover:shadow-lg duration-300 rounded-sm px-3 pt-3 pb-4">
      <h3 class="font-bold flex items-center gap-x-1.5 text-sm">
        <LocationTargetIcon size={16} class="shrink-0" />
        <span>Current location</span>
      </h3>
      <div class="space-y-1.5 mt-1">
        <fieldset class="fieldset">
          <label for="current-location-card-output-format" class="label">
            Output format
          </label>
          <div>
            <select
              id="current-location-card-output-format"
              name="outputName"
              value={outputFormat}
              class="select select-xs w-fit"
              onChange={handleOutputFormatChange}
            >
              {GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <section aria-labelledby="current-location-card-title">
          <div class="flex items-center gap-x-2">
            <div>
              <h5
                id="current-location-card-title"
                class="text-xs text-base-content/60 mb-1.25"
              >
                Coordinates
              </h5>
              <p class="text-xs text-base-content/90">
                {coordinatesFormatted.value}
              </p>
            </div>
            <CopyToClipboardBtn text={coordinatesFormatted.value!} />
          </div>
        </section>
        <fieldset class="fieldset">
          <label for="current-location-card-tracking-mode" class="label">
            Tracking mode
          </label>
          <div>
            <select
              id="current-location-card-tracking-mode"
              name="outputName"
              value={trackingProfileFrequency}
              class="select select-xs w-fit"
              onChange={handleTrackingModeChange}
            >
              {TRACKING_PROFILE_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <label class="label text-base-content/90">
            High-accuracy GPS
            <input
              type="checkbox"
              class="toggle toggle-sm toggle-primary"
              checked={highAccuracyGeolocationEnabled}
              onChange={handleHighAccuracyGeolocationChange}
            />
          </label>
        </fieldset>
      </div>
      <PinsPagePinnedLocationCardFokontany
        className="mt-3"
        fokontany={currentLocationEntry.value.fokontany}
        isLoading={currentLocationEntry.value.isLoadingFokontany ?? false}
        errorCause={currentLocationEntry.value.fokontanyErrorCause}
      />
      <div class="flex items-start gap-x-1 mt-4">
        <ClockIcon size={12} class="text-base-content/70 mt-0.5" />
        <p class="text-xs text-base-content/70">
          Last updated at{" "}
          <strong
            title={fullLastUpdateAtFormatted.value!}
            class="text-base-content text-xs font-normal"
          >
            {lastUpdatedAtDynamic.dateTime.value}
          </strong>
        </p>
      </div>
      <div class="mt-4 flex gap-x-2.5">
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onClick={handleShowOnMapClick}
        >
          <MapPinnedIcon size={14} />
          Show on map
        </button>
        <button
          type="button"
          class="btn btn-sm btn-error"
          onClick={() => pinnedLocationsStore.clearCurrentLocationTracking()}
        >
          <LocateOffIcon size={14} />
          <span>Stop tracking</span>
        </button>
      </div>
    </article>
  );
}
