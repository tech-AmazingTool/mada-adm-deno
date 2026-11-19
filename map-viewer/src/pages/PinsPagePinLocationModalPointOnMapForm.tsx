import { useSignal } from "@preact/signals";
import { MapPinPlusIcon, SaveIcon, XIcon } from "lucide-preact";

import { useStoresContext } from "@/contexts/stores/index.ts";

export default function PinsPagePinLocationModalPointOnMapForm() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pointOnMapPayload } = pinnedLocationsStore;

  const titleInputValue = useSignal<string>(
    pointOnMapPayload.value?.title ?? "",
  );
  const titleInputWasTouched = useSignal(false);

  const inputBorderColorClassName =
    (titleInputWasTouched.value && !titleInputValue.value) ? "input-error" : "";

  function handleTitleInputChange(e: Event) {
    titleInputValue.value = (e.currentTarget as HTMLInputElement).value;
    titleInputWasTouched.value = true;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!titleInputValue.value) return;
    const payload = pointOnMapPayload.value;
    pointOnMapPayload.value = {
      title: titleInputValue.value,
    };
    if (!payload) pinnedLocationsStore.showPanel.value = false;
  }

  function handleReset(e: Event) {
    e.preventDefault();
    pinnedLocationsStore.pointOnMapPayload.value = null;
    titleInputValue.value = "";
    titleInputWasTouched.value = false;
  }

  return (
    <form onSubmit={handleSubmit} onReset={handleReset}>
      <div class="space-y-3">
        <fieldset class="fieldset">
          <label for="pin-location-modal-point-on-map-title" class="label">
            Title
          </label>
          <input
            type="text"
            id="pin-location-modal-point-on-map-title"
            class={`input input-sm ${inputBorderColorClassName}`}
            placeholder="Title of the pinned location"
            value={titleInputValue}
            onInput={handleTitleInputChange}
          />
          {titleInputWasTouched.value && !titleInputValue.value && (
            <p class="label text-error">
              The pinned location title must not be empty.
            </p>
          )}
        </fieldset>
        <div class="flex gap-x-3">
          {pointOnMapPayload.value
            ? (
              <>
                <button
                  type="submit"
                  disabled={titleInputValue.value ===
                    pointOnMapPayload.value.title}
                  class="btn btn-primary"
                >
                  <SaveIcon size={16} />
                  <span>Save</span>
                </button>
                <button type="reset" class="btn btn-error">
                  <XIcon size={16} />
                  <span>Cancel pin</span>
                </button>
              </>
            )
            : (
              <button type="submit" class="btn btn-primary">
                <MapPinPlusIcon size={16} />
                <span>Add pin</span>
              </button>
            )}
        </div>
      </div>
    </form>
  );
}
