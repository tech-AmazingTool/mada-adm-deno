import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { CircleXIcon, InfoIcon, LocateOffIcon } from "lucide-preact";
import type { TargetedEvent, TargetedSubmitEvent } from "preact";

import {
  CURRENT_LOCATION_TRACKING_HIGH_ACCURACY_GPS_DESCRIPTION,
  CURRENT_LOCATION_TRACKING_PROFILE_DESCRIPTION,
  type CurrentLocationTrackingProfile,
  TRACKING_PROFILE_FREQUENCY_OPTIONS,
  UNSUPPORTED_GEOLOCATION_ERROR_MESSAGE,
} from "@/consts/pinned-locations.consts.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";
import LocationTargetIcon from "@/components/icons/LocationTargetIcon.tsx";

/**
 * Floating action button for tracking the current device location.
 *
 * When no tracking session is active it opens a configuration modal.
 * When a tracking session is active it shows a primary-colored locate icon
 * and clicking it stops the tracking.
 */
export default function AppMapTrackCurrentLocationFAB() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const {
    trackingProfileFrequency,
    highAccuracyGeolocationEnabled,
    currentLocationEntry,
    geolocationIsLoading,
    geolocationErrorMessage,
  } = pinnedLocationsStore;

  const dialogEltRef = useRef<HTMLDialogElement>(null);
  const geolocationIsSupported = useSignal(true);

  const isTracking = !!currentLocationEntry.value;

  function handleFABClick() {
    if (isTracking) {
      pinnedLocationsStore.clearCurrentLocationTracking();
    } else {
      dialogEltRef.current?.showModal();
    }
  }

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

  async function handleStartTrackingSubmit(
    e: TargetedSubmitEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    geolocationIsSupported.value = "geolocation" in navigator;
    if (!geolocationIsSupported.value) return;

    const isSuccess = await pinnedLocationsStore.loadInitialCurrentLocation();

    if (isSuccess) {
      dialogEltRef.current?.close();
    }
  }

  return (
    <div>
      <div
        class="tooltip tooltip-left"
        data-tip={isTracking
          ? "Stop current location tracking"
          : "Track current location"}
      >
        <button
          type="button"
          class="btn btn-circle btn-lg shadow-sm"
          onClick={handleFABClick}
        >
          {isTracking
            ? (
              <LocationTargetIcon
                size={18}
                color="var(--color-primary)"
                stroke-width={2}
              />
            )
            : <LocateOffIcon size={18} stroke-width={2} />}
        </button>
      </div>

      <dialog
        ref={dialogEltRef}
        class="modal"
      >
        <div class="modal-box w-11/12 max-w-md">
          <h3 class="text-lg font-bold flex items-center gap-x-3 mb-4">
            <LocationTargetIcon size={20} color="currentColor" />{" "}
            <span>Track current location</span>
          </h3>

          <form
            class="flex flex-col gap-y-2"
            onSubmit={handleStartTrackingSubmit}
          >
            <div class="space-y-2">
              <fieldset class="fieldset">
                <label
                  for="fab-tracking-profile-frequency"
                  class="label text-base-content/90"
                >
                  Tracking Mode
                </label>
                <div>
                  <select
                    id="fab-tracking-profile-frequency"
                    name="fab-tracking-profile-frequency"
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

            {(!geolocationIsSupported.value ||
              !!geolocationErrorMessage.value) && (
              <div role="alert" class="alert alert-error">
                <CircleXIcon class="h-6 w-6 shrink-0 stroke-current" />
                <p class="text-sm">
                  {!geolocationIsSupported.value
                    ? UNSUPPORTED_GEOLOCATION_ERROR_MESSAGE
                    : geolocationErrorMessage.value}
                </p>
              </div>
            )}

            <div class="modal-action">
              <form method="dialog">
                <button type="submit" class="btn">
                  Close
                </button>
              </form>
              <button
                type="submit"
                disabled={geolocationIsLoading.value}
                class="btn btn-primary flex items-center gap-x-2"
              >
                {geolocationIsLoading.value
                  ? <span class="loading loading-spinner"></span>
                  : <LocationTargetIcon size={14} color="currentColor" />}
                <span>
                  {geolocationIsLoading.value
                    ? "Getting current location"
                    : "Start tracking"}
                </span>
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  );
}
