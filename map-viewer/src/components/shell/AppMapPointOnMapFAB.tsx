import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { MapPinPlusIcon } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Floating action button for pointing a pin on the map.
 *
 * When no point-on-map payload is active it opens a configuration modal
 * prompting the user for a title. When a payload is present the FAB turns
 * primary-colored and clicking it cancels the pin pointing.
 */
export default function AppMapPointOnMapFAB() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pointOnMapPayload } = pinnedLocationsStore;

  const dialogEltRef = useRef<HTMLDialogElement>(null);

  const titleInputValue = useSignal<string>("");
  const titleInputWasTouched = useSignal(false);

  const titleHasError = titleInputWasTouched.value && !titleInputValue.value;
  const titleInputBorderColorClassName = titleHasError ? "input-error" : "";

  const isPointing = !!pointOnMapPayload.value;

  function handleFABClick() {
    if (isPointing) {
      pointOnMapPayload.value = null;
    } else {
      titleInputValue.value = "";
      titleInputWasTouched.value = false;
      dialogEltRef.current?.showModal();
    }
  }

  function handleTitleInputChange(e: Event) {
    titleInputValue.value = (e.currentTarget as HTMLInputElement).value;
    titleInputWasTouched.value = true;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    titleInputWasTouched.value = true;
    if (!titleInputValue.value) return;
    pointOnMapPayload.value = {
      title: titleInputValue.value,
    };
    dialogEltRef.current?.close();
  }

  return (
    <div>
      <div
        class="tooltip tooltip-left"
        data-tip={isPointing
          ? "Cancel map pin pointing"
          : "Point a pin on the map"}
      >
        <button
          type="button"
          class={`btn btn-lg btn-circle shadow-sm`}
          onClick={handleFABClick}
        >
          <MapPinPlusIcon
            size={20}
            stroke-width={2}
            class={isPointing ? "text-primary" : "text-current"}
          />
        </button>
      </div>

      <dialog
        ref={dialogEltRef}
        class="modal"
      >
        <div class="modal-box w-11/12 max-w-md">
          <h3 class="text-lg font-bold flex items-center gap-x-3 mb-1">
            <MapPinPlusIcon /> <span>Point a pin on the map</span>
          </h3>
          <p class="text-sm text-base-content/70 mb-4 pt-2">
            Drop a marker onto the map at the exact location of the pin.
          </p>

          <form
            class="flex flex-col gap-y-2"
            onSubmit={handleSubmit}
          >
            <fieldset class="fieldset">
              <label
                for="fab-point-on-map-title"
                class="label text-base-content/90"
              >
                Title
              </label>
              <input
                type="text"
                id="fab-point-on-map-title"
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
