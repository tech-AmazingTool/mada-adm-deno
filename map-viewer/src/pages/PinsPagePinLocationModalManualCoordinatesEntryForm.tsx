import { useSignal } from "@preact/signals";
import { MapPinPlusIcon } from "lucide-preact";
import { convert } from "geo-coordinates-parser";
import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Form for manually entering geographic coordinates to pin a location on the map.
 */
export default function PinsPagePinLocationModalManualCoordinatesEntryForm() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();

  const titleInputValue = useSignal<string>("");
  const titleInputWasTouched = useSignal(false);

  const coordinatesInputValue = useSignal<string>("");
  const coordinatesInputWasTouched = useSignal(false);
  const coordinatesInputError = useSignal(false);

  const titleHasError = titleInputWasTouched.value && !titleInputValue.value;
  const titleInputBorderColorClassName = titleHasError ? "input-error" : "";

  const coordinatesHasError = coordinatesInputWasTouched.value &&
    (!coordinatesInputValue.value || coordinatesInputError.value);
  const coordinatesInputBorderColorClassName = coordinatesHasError
    ? "input-error"
    : "";

  function handleTitleInputChange(e: Event) {
    titleInputValue.value = (e.currentTarget as HTMLInputElement).value;
    titleInputWasTouched.value = true;
  }

  function handleCoordinatesInputChange(e: Event) {
    coordinatesInputValue.value = (e.currentTarget as HTMLInputElement).value;
    coordinatesInputWasTouched.value = true;
    coordinatesInputError.value = false;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    titleInputWasTouched.value = true;
    coordinatesInputWasTouched.value = true;
    if (!titleInputValue.value || !coordinatesInputValue.value) return;
    try {
      const parsed = convert(coordinatesInputValue.value.trim());
      pinnedLocationsStore.addPinnedLocationEntry({
        title: titleInputValue.value,
        coordinates: {
          lat: parsed.decimalLatitude,
          lng: parsed.decimalLongitude,
        },
      });
      pinnedLocationsStore.showPanel.value = false;
      titleInputValue.value = "";
      titleInputWasTouched.value = false;
      coordinatesInputValue.value = "";
      coordinatesInputWasTouched.value = false;
      coordinatesInputError.value = false;
    } catch (_err) {
      coordinatesInputError.value = true;
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div class="space-y-3">
        <div class="space-y-1">
          <fieldset class="fieldset">
            <label
              for="pin-location-modal-manual-coordinates-title"
              class="label"
            >
              Title
            </label>
            <input
              type="text"
              id="pin-location-modal-manual-coordinates-title"
              class={`input input-sm ${titleInputBorderColorClassName}`}
              placeholder="Title of the pinned location"
              value={titleInputValue}
              onInput={handleTitleInputChange}
            />
            {titleHasError && (
              <p class="label text-error">
                The pinned location title must not be empty.
              </p>
            )}
          </fieldset>
          <fieldset class="fieldset">
            <label
              for="pin-location-modal-manual-coordinates-value"
              class="label"
            >
              Coordinates
            </label>
            <input
              type="text"
              id="pin-location-modal-manual-coordinates-value"
              class={`input input-sm ${coordinatesInputBorderColorClassName}`}
              placeholder="Geographic coordinates in any correct format"
              value={coordinatesInputValue}
              onInput={handleCoordinatesInputChange}
            />
            {coordinatesHasError && (
              <p class="label text-error">
                {coordinatesInputError.value
                  ? "Could not parse the coordinates being entered"
                  : "The coordinates must not be empty."}
              </p>
            )}
          </fieldset>
        </div>
        <div class="flex gap-x-3">
          <button type="submit" class="btn btn-primary">
            <MapPinPlusIcon size={16} />
            <span>Add pin</span>
          </button>
        </div>
      </div>
    </form>
  );
}
