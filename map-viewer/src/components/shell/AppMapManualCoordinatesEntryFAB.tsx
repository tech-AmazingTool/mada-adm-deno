import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { CompassIcon, MapPinPlusIcon } from "lucide-preact";
import { convert } from "geo-coordinates-parser";
import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Floating action button for manually entering geographic coordinates
 * to pin a location on the map.
 *
 * Opens a modal with title and coordinates fields. On successful
 * submission the pinned location entry is added and the modal closes.
 */
export default function AppMapManualCoordinatesEntryFAB() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();

  const dialogEltRef = useRef<HTMLDialogElement>(null);

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

  function handleFABClick() {
    titleInputValue.value = pinnedLocationsStore.getNextUntitledLocationTitle();
    titleInputWasTouched.value = false;
    coordinatesInputValue.value = "";
    coordinatesInputWasTouched.value = false;
    coordinatesInputError.value = false;
    dialogEltRef.current?.showModal();
  }

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
      dialogEltRef.current?.close();
    } catch (_err) {
      coordinatesInputError.value = true;
    }
  }

  return (
    <div>
      <div
        class="tooltip tooltip-left"
        data-tip="Enter geographic coordinates"
      >
        <button
          type="button"
          class="btn btn-lg btn-circle shadow-sm"
          onClick={handleFABClick}
        >
          <CompassIcon size={20} stroke-width={2} />
        </button>
      </div>

      <dialog
        ref={dialogEltRef}
        class="modal"
      >
        <div class="modal-box w-11/12 max-w-md">
          <h3 class="text-lg font-bold flex items-center gap-x-3 mb-1">
            <CompassIcon /> <span>Manual Coordinates Entry</span>
          </h3>
          <p class="text-sm text-base-content/70 mb-4 pt-2">
            Enter the geographic coordinates of the pin's location.
          </p>

          <form
            class="flex flex-col gap-y-2"
            onSubmit={handleSubmit}
          >
            <div class="space-y-2">
              <fieldset class="fieldset">
                <label
                  for="fab-manual-coordinates-value"
                  class="label text-base-content/90"
                >
                  Coordinates
                </label>
                <input
                  type="text"
                  id="fab-manual-coordinates-value"
                  class={`input w-full ${coordinatesInputBorderColorClassName}`}
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
              <fieldset class="fieldset">
                <label
                  for="fab-manual-coordinates-title"
                  class="label text-base-content/90"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="fab-manual-coordinates-title"
                  class={`input w-full ${titleInputBorderColorClassName}`}
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
            </div>

            <div class="modal-action">
              <form method="dialog">
                <button type="submit" class="btn">
                  Close
                </button>
              </form>
              <button type="submit" class="btn btn-primary">
                <MapPinPlusIcon size={16} />
                <span>Add pin</span>
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
