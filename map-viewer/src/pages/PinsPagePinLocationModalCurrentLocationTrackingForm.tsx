import { TargetedEvent, TargetedSubmitEvent } from "preact";
import { useRef } from "preact/hooks";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import {
  CircleStopIcon,
  CircleXIcon,
  ClockIcon,
  InfoIcon,
} from "lucide-preact";
import { coordinateSystems, createCoordinate } from "@accelint/geo";
import {
  CURRENT_LOCATION_TRACKING_HIGH_ACCURACY_GPS_DESCRIPTION,
  CURRENT_LOCATION_TRACKING_PROFILE_DESCRIPTION,
  CurrentLocationTrackingProfile,
  GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS,
  GeographicCoordinateOutputFormat,
  TRACKING_PROFILE_FREQUENCY_OPTIONS,
  UNSUPPORTED_GEOLOCATION_ERROR_MESSAGE,
} from "@/consts/pinned-locations.consts.ts";
import LocationTargetIcon from "@/components/icons/LocationTargetIcon.tsx";
import CopyToClipboardBtn from "@/components/shared/CopyToClipboardBtn.tsx";
import useDynamicDateTime from "@/hooks/useDynamicDateTime.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function PinsPagePinLocationModalCurrentLocationTrackingForm() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const {
    trackingProfileFrequency,
    highAccuracyGeolocationEnabled,
    currentLocationEntry,
    geolocationIsLoading,
    geolocationErrorMessage,
  } = pinnedLocationsStore;

  function handleTrackingModeChange(
    e: TargetedEvent<HTMLSelectElement, Event>,
  ) {
    trackingProfileFrequency.value = e.currentTarget
      .value as CurrentLocationTrackingProfile;
  }

  function handleHighAccuracyGeolocationChange(
    e: TargetedEvent<HTMLInputElement, Event>,
  ) {
    highAccuracyGeolocationEnabled.value = e.currentTarget.checked;
  }

  const geolocationIsSupported = useSignal(true);

  async function handleSubmit(e: TargetedSubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    geolocationIsSupported.value = "geolocation" in navigator;
    if (!geolocationIsSupported.value) return;

    const isSuccess = await pinnedLocationsStore.loadInitialCurrentLocation();

    if (isSuccess) {
      pinnedLocationsStore.showPanel.value = false;
    }
  }

  function handleReset(e: TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    pinnedLocationsStore.clearCurrentLocationTracking();
  }

  const outputFormat = useSignal<GeographicCoordinateOutputFormat>(
    GeographicCoordinateOutputFormat.DecimalDegrees,
  );

  function handleOutputFormatChange(
    e: TargetedEvent<HTMLSelectElement, Event>,
  ) {
    outputFormat.value = e.currentTarget
      .value as GeographicCoordinateOutputFormat;
  }

  const currentLocationCoordinatesFormatted = useComputed<string | null>(() => {
    const entryCoordinates = currentLocationEntry.value?.coordinates;
    if (!entryCoordinates) return null;
    const create = createCoordinate(coordinateSystems.dd, "LATLON");
    const coord = create([entryCoordinates.lat, entryCoordinates.lng]);
    switch (outputFormat.value) {
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
          `Unsupported outputFormat ${outputFormat.value} in currentLocationCoordinatesFormatted`,
        );
    }
  });

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

  return (
    <form
      class="flex flex-col gap-y-4"
      onSubmit={handleSubmit}
      onReset={handleReset}
    >
      <div class="space-y-2">
        <fieldset class="fieldset">
          <label
            for="tracking-profile-frequency"
            class="label text-base-content/90"
          >
            Tracking Mode
          </label>
          <div>
            <select
              id="tracking-profile-frequency"
              name="tracking-profile-frequency"
              value={trackingProfileFrequency.value}
              class="select select-sm w-fit"
              onChange={handleTrackingModeChange}
            >
              {TRACKING_PROFILE_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div class="flex items-start gap-x-1.5 text-base-content/70">
            <InfoIcon size={14} class="shrink-0 relative top-0.5" />
            <p class="text-xs">
              {CURRENT_LOCATION_TRACKING_PROFILE_DESCRIPTION}
            </p>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <label class="label text-base-content/90">
            Enable high-accuracy GPS
            <input
              type="checkbox"
              class="toggle toggle-sm toggle-primary"
              checked={highAccuracyGeolocationEnabled.value}
              onChange={handleHighAccuracyGeolocationChange}
            />
          </label>
          <div class="flex items-start gap-x-1.5 text-base-content/70">
            <InfoIcon size={14} class="shrink-0 relative top-0.5" />
            <p class="text-xs">
              {CURRENT_LOCATION_TRACKING_HIGH_ACCURACY_GPS_DESCRIPTION}
            </p>
          </div>
        </fieldset>
      </div>
      {currentLocationEntry.value && (
        <article class="bg-base-100 shadow shadow-base-content/40 w-full rounded px-4 py-3">
          <h5 class="text-sm font-bold">Current Location</h5>
          <div class="flex flex-wrap gap-x-4 gap-y-2 mt-1">
            <fieldset class="fieldset">
              <label
                for="current-location-output-format-select"
                class="label"
              >
                Output Format:
              </label>
              <div>
                <select
                  id="current-location-output-format-select"
                  name="current-location-output-format-select"
                  value={outputFormat.value}
                  class="select select-sm w-fit"
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
            <section
              aria-describedby="modal-current-location-coordinates-title"
              class="py-1"
            >
              <div class="flex items-center gap-x-2">
                <div>
                  <h6
                    id="modal-current-location-coordinates-title"
                    class="text-xs text-base-content/60 mb-1"
                  >
                    Coordinates:
                  </h6>
                  <p class="text-sm">
                    {currentLocationCoordinatesFormatted.value}
                  </p>
                </div>
                <div>
                  <CopyToClipboardBtn
                    text={currentLocationCoordinatesFormatted.value!}
                  />
                </div>
              </div>
            </section>
          </div>
          <section
            aria-describedby="modal-current-location-last-updated-at-paragraph"
            class="flex items-center gap-x-1.5 mt-2"
          >
            <ClockIcon size={14} class="text-base-content/70" />
            <p
              id="modal-current-location-last-updated-at-paragraph"
              class="text-base-content/70 text-xs"
            >
              Last updated at{" "}
              <strong
                title={fullLastUpdateAtFormatted.value!}
                class="text-base-content text-xs font-normal"
              >
                {lastUpdatedAtDynamic.dateTime.value}
              </strong>
            </p>
          </section>
        </article>
      )}
      {(!geolocationIsSupported.value || !!geolocationErrorMessage.value) && (
        <div role="alert" class="alert alert-error">
          <CircleXIcon class="h-6 w-6 shrink-0 stroke-current" />
          <p class="text-sm">
            {!geolocationIsSupported.value
              ? UNSUPPORTED_GEOLOCATION_ERROR_MESSAGE
              : geolocationErrorMessage.value}
          </p>
        </div>
      )}
      <div class="flex gap-x-3">
        {!currentLocationEntry.value
          ? (
            <button
              type="submit"
              disabled={geolocationIsLoading.value}
              class="btn btn-primary flex items-center gap-x-2"
            >
              {geolocationIsLoading.value
                ? <span class="loading loading-spinner"></span>
                : <LocationTargetIcon size={16} color="currentColor" />}
              <span>
                {geolocationIsLoading.value
                  ? "Getting current location"
                  : "Start tracking"}
              </span>
            </button>
          )
          : (
            <button
              type="reset"
              class="btn btn-error flex items-center gap-x-2"
            >
              <CircleStopIcon size={16} />
              <span>Stop tracking</span>
            </button>
          )}
      </div>
    </form>
  );
}
