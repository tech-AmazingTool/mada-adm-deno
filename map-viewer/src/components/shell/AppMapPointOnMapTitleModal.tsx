import { useEffect, useRef } from "preact/hooks";
import { useSignal, useSignalEffect } from "@preact/signals";
import { MapPinPlusIcon, SaveIcon } from "lucide-preact";

import { useStoresContext } from "@/contexts/stores/index.ts";

/**
 * Modal dialog that prompts the user to customize or confirm the title
 * of a newly dropped pin on the map after it has been placed.
 */
export default function AppMapPointOnMapTitleModal() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const {
    showPointOnMapTitleModal,
    pointOnMapTargetEntryId,
    pinnedLocations,
  } = pinnedLocationsStore;

  const dialogEltRef = useRef<HTMLDialogElement>(null);
  const inputEltRef = useRef<HTMLInputElement>(null);

  const titleInputValue = useSignal<string>("");
  const titleInputWasTouched = useSignal(false);

  const titleHasError = titleInputWasTouched.value && !titleInputValue.value;
  const titleInputBorderColorClassName = titleHasError ? "input-error" : "";

  useSignalEffect(() => {
    const dialog = dialogEltRef.current;
    if (!dialog) return;

    if (showPointOnMapTitleModal.value) {
      const targetId = pointOnMapTargetEntryId.value;
      const target = targetId !== null
        ? pinnedLocations.value.find((e) => e.id === targetId)
        : null;

      titleInputValue.value = target?.title ?? "";
      titleInputWasTouched.value = false;

      if (!dialog.open) {
        dialog.showModal();
        setTimeout(() => {
          inputEltRef.current?.focus();
          inputEltRef.current?.select();
        }, 50);
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  });

  useEffect(() => {
    dialogEltRef.current?.addEventListener("close", () => {
      pinnedLocationsStore.closePointOnMapTitleModal();
    });
  }, []);

  function handleTitleInputChange(e: Event) {
    titleInputValue.value = (e.currentTarget as HTMLInputElement).value;
    titleInputWasTouched.value = true;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    titleInputWasTouched.value = true;
    if (!titleInputValue.value.trim()) return;

    const targetId = pointOnMapTargetEntryId.value;
    if (targetId !== null) {
      pinnedLocationsStore.updatePinnedLocationEntryTitle(
        targetId,
        titleInputValue.value.trim(),
      );
    }
    pinnedLocationsStore.closePointOnMapTitleModal();
  }

  function handleClose() {
    pinnedLocationsStore.closePointOnMapTitleModal();
  }

  return (
    <dialog
      ref={dialogEltRef}
      class="modal"
    >
      <div class="modal-box w-11/12 max-w-md">
        <h3 class="text-lg font-bold flex items-center gap-x-3 mb-1">
          <MapPinPlusIcon /> <span>Point a pin on the map</span>
        </h3>
        <p class="text-sm text-base-content/70 mb-4 pt-2">
          The pin has been placed on the map. Enter a custom title or keep the
          default name.
        </p>

        <form
          class="flex flex-col gap-y-2"
          onSubmit={handleSubmit}
        >
          <fieldset class="fieldset">
            <label
              for="point-on-map-title-modal-input"
              class="label text-base-content/90"
            >
              Title
            </label>
            <input
              ref={inputEltRef}
              type="text"
              id="point-on-map-title-modal-input"
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
            <button
              type="button"
              class="btn"
              onClick={handleClose}
            >
              Close
            </button>
            <button type="submit" class="btn btn-primary">
              <SaveIcon size={16} />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
