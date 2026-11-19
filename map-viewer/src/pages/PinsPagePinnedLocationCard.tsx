import { useEffect, useRef } from "preact/hooks";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import {
  ArrowDownIcon,
  ArrowDownToLineIcon,
  ArrowUpIcon,
  ArrowUpToLineIcon,
  ClockIcon,
  GripVerticalIcon,
  MapPinIcon,
  MapPinnedIcon,
  MoveIcon,
  PencilIcon,
  PinOffIcon,
} from "lucide-preact";
import {
  GEOGRAPHIC_COORDINATE_OUTPUT_FORMAT_OPTIONS,
  GeographicCoordinateOutputFormat,
} from "@/consts/pinned-locations.consts.ts";
import {
  PinnedLocationEntry,
  PinnedLocationMoveType,
} from "@/stores/pinned-locations.store.ts";
import CopyToClipboardBtn from "@/components/shared/CopyToClipboardBtn.tsx";
import useDynamicDateTime from "@/hooks/useDynamicDateTime.ts";
import PinsPagePinnedLocationCardFokontany from "@/pages/PinsPagePinnedLocationCardFokontany.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";
import {
  formatGeographicCoordinates,
  showPinnedLocationOnMapEventHub,
} from "@/helpers/pinned-locations.helper.ts";
import { convert } from "geo-coordinates-parser";

export type PinsPagePinnedLocationCardProps = {
  pinnedLocationEntry: PinnedLocationEntry;
  index: number;
};

export default function PinsPagePinnedLocationCard(
  { pinnedLocationEntry, index }: PinsPagePinnedLocationCardProps,
) {
  const indexRef = useRef(index);
  indexRef.current = index;

  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { pinnedLocations } = pinnedLocationsStore;

  const outputFormat = useSignal<GeographicCoordinateOutputFormat>(
    GeographicCoordinateOutputFormat.DecimalDegrees,
  );

  function handleOutputFormatChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    outputFormat.value = target.value as GeographicCoordinateOutputFormat;
  }

  const coordinatesFormatted = useComputed<string | null>(() => {
    return formatGeographicCoordinates(
      pinnedLocationEntry.coordinates,
      outputFormat.value,
    );
  });

  const lastUpdatedAtDynamic = useDynamicDateTime(
    pinnedLocationEntry.updatedAt,
  );

  useSignalEffect(() => {
    lastUpdatedAtDynamic.start(pinnedLocationEntry.updatedAt);
  });

  const lastUpdatedAtIntlFormatterRef = useRef<Intl.DateTimeFormat>(
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  );

  const fullLastUpdateAtFormatted = useComputed<string | null>(() => {
    const date = pinnedLocationEntry.updatedAt;
    if (!date) return null;
    return lastUpdatedAtIntlFormatterRef.current.format(date);
  });

  function handleShowOnMapClick() {
    showPinnedLocationOnMapEventHub.dispatch(pinnedLocationEntry.id);
  }

  function handleDeleteClick() {
    pinnedLocationsStore.deletePinnedLocation(pinnedLocationEntry.id);
  }

  // --- Title Edit Form ---
  const isTitleFormActive = useSignal(false);
  const titleInputValue = useSignal(pinnedLocationEntry.title);

  function handleTitleEditToggle() {
    titleInputValue.value = pinnedLocationEntry.title;
    isTitleFormActive.value = true;
  }

  function handleTitleEditCancel() {
    isTitleFormActive.value = false;
  }

  function handleTitleEditSubmit(e: Event) {
    e.preventDefault();
    const newTitle = titleInputValue.value.trim();
    if (!newTitle) return;
    pinnedLocationsStore.updatePinnedLocationEntryTitle(
      pinnedLocationEntry.id,
      newTitle,
    );
    isTitleFormActive.value = false;
  }

  // --- Coordinates Edit Form ---
  const isCoordinatesFormActive = useSignal(false);
  const coordinatesInputValue = useSignal("");
  const coordinatesInputError = useSignal(false);

  function handleCoordinatesEditToggle() {
    coordinatesInputValue.value = coordinatesFormatted.value || "";
    coordinatesInputError.value = false;
    isCoordinatesFormActive.value = true;
  }

  function handleCoordinatesEditCancel() {
    isCoordinatesFormActive.value = false;
    coordinatesInputError.value = false;
  }

  function handleCoordinatesEditSubmit(e: Event) {
    e.preventDefault();
    const newVal = coordinatesInputValue.value.trim();
    if (!newVal) return;
    try {
      const parsed = convert(newVal);
      pinnedLocationsStore.updatePinnedLocationCoordinates(
        pinnedLocationEntry.id,
        {
          lat: parsed.decimalLatitude,
          lng: parsed.decimalLongitude,
        },
      );
      isCoordinatesFormActive.value = false;
      coordinatesInputError.value = false;
    } catch (_err) {
      coordinatesInputError.value = true;
    }
  }

  function handleLockToggle(e: Event) {
    const target = e.target as HTMLInputElement;
    pinnedLocationsStore.updatePinnedLocationIsLocked(
      pinnedLocationEntry.id,
      target.checked,
    );
  }

  // --- Draggable feature ---
  const articleEltRef = useRef<HTMLElement>(null);

  const canMoveUp = index > 0;
  const canMoveDown = index < (pinnedLocations.value.length - 1);
  const moveOptions: {
    text: string;
    icon: preact.VNode;
    moveType: PinnedLocationMoveType;
    isDisabled: boolean;
  }[] = [
    {
      text: "Move to top",
      icon: <ArrowUpToLineIcon size={14} />,
      moveType: "top",
      isDisabled: !canMoveUp,
    },
    {
      text: "Move up",
      icon: <ArrowUpIcon size={14} />,
      moveType: "up",
      isDisabled: !canMoveUp,
    },
    {
      text: "Move down",
      icon: <ArrowDownIcon size={14} />,
      moveType: "down",
      isDisabled: !canMoveDown,
    },
    {
      text: "Move to bottom",
      icon: <ArrowDownToLineIcon size={14} />,
      moveType: "bottom",
      isDisabled: !canMoveDown,
    },
  ];

  function handleMoveClick(
    e: Event,
    moveType: PinnedLocationMoveType,
    isDisabled: boolean,
  ) {
    e.preventDefault();
    if (isDisabled) return;
    pinnedLocationsStore.movePinnedLocationListItem(
      pinnedLocationEntry.id,
      moveType,
    );
  }

  const dragBtnEltRef = useRef<HTMLButtonElement>(null);
  const draggingCardTemplateEltRef = useRef<HTMLDivElement>(null);
  const dropTargetEltRef = useRef<HTMLDivElement>(null);

  const isDragging = useSignal(false);
  const dragSourceIndex = useSignal<number | null>(null);
  const grabSlotLinePosition = useComputed<"top" | "bottom" | null>(() => {
    if (dragSourceIndex.value === null || dragSourceIndex.value === index) {
      return null;
    }
    return dragSourceIndex.value > index ? "top" : "bottom";
  });

  const draggableCleanupFnRef = useRef<() => void | null>(null);
  const dropTargetCleanupFnRef = useRef<() => void | null>(null);

  useEffect(
    () => {
      async function setupDraggable() {
        const { draggable, dropTargetForElements } = await import(
          "@atlaskit/pragmatic-drag-and-drop/element/adapter"
        );
        const { setCustomNativeDragPreview } = await import(
          "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
        );

        draggableCleanupFnRef.current = draggable({
          element: articleEltRef.current!,
          dragHandle: dragBtnEltRef.current!,
          getInitialData: () => ({
            index: indexRef.current,
            pinnedLocationId: pinnedLocationEntry.id,
          }),
          onGenerateDragPreview({ nativeSetDragImage }) {
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: ({ container }) => {
                return {
                  x: container.offsetWidth - 8,
                  y: 8,
                };
              },
              render({ container }) {
                const elt = draggingCardTemplateEltRef.current!.cloneNode(
                  true,
                ) as HTMLDivElement;
                elt.classList.remove("hidden");
                const clientWidth = articleEltRef.current!.clientWidth;
                elt.style.width = (clientWidth * 0.8) + "px";
                elt.style.maxWidth = clientWidth + "px";
                container.appendChild(elt);
              },
            });
          },
          onDragStart: () => {
            isDragging.value = true;
          },
          onDrop: () => {
            isDragging.value = false;
          },
        });

        dropTargetCleanupFnRef.current = dropTargetForElements({
          element: dropTargetEltRef.current!,
          onDragEnter({ source }) {
            dragSourceIndex.value = source.data.index as number;
            dropTargetEltRef.current!.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          },
          onDragLeave() {
            dragSourceIndex.value = null;
          },
          onDrop({ source }) {
            pinnedLocationsStore.movePinnedLocationListItem(
              pinnedLocationEntry.id,
              source.data.index as number,
            );
            dragSourceIndex.value = null;
          },
        });
      }

      setupDraggable();

      return () => {
        draggableCleanupFnRef.current?.();
        dropTargetCleanupFnRef.current?.();
      };
    },
    [],
  );

  const articleClassName = isDragging.value ? "opacity-50" : "";
  const dragBtnClassName = isDragging.value ? "cursor-grabbing" : "cursor-grab";
  const dropAreaClassName = grabSlotLinePosition.value !== null
    ? (
      grabSlotLinePosition.value === "top" ? "flex-col" : "flex-col-reverse"
    )
    : "flex-col";

  return (
    <>
      <div
        ref={draggingCardTemplateEltRef}
        class="shadow shadow-base-content/30 rounded-sm px-3 pt-3 pb-4 bg-base-100 hidden"
      >
        <div class="flex items-start justify-between">
          <h3 class="font-bold flex items-start gap-x-1.5 text-sm text-base-content">
            <MapPinIcon size={17} stroke-width={2} class="mt-0.5 shrink-0" />
            <span>{pinnedLocationEntry.title}</span>
          </h3>
          <button
            type="button"
            class={`btn btn-sm btn-square -mt-1 -mr-1`}
          >
            <GripVerticalIcon size={16} class="text-base-content/70" />
          </button>
        </div>
      </div>

      <div ref={dropTargetEltRef} class={`flex gap-y-5 ${dropAreaClassName}`}>
        {grabSlotLinePosition.value && (
          <div class="w-full h-1 bg-primary/80 rounded-full shadow shadow-primary/50 relative">
            <span class="bg-base-100 size-3 rounded-full absolute left-0 top-1/2 -translate-x-3/4 -translate-y-1/2 border-4 border-primary/80 shadow shadow-primary/50">
            </span>
          </div>
        )}

        <article
          ref={articleEltRef}
          class={`shadow shadow-base-content/30 hover:shadow-lg duration-300 rounded-sm px-3 pt-3 pb-4 bg-base-100 ${articleClassName}`}
        >
          <div class="mb-3">
            <div class="flex items-start justify-between">
              <h3 class="font-bold flex items-start gap-x-1.5 text-sm text-base-content">
                <MapPinIcon
                  size={17}
                  stroke-width={2}
                  class="mt-0.5 shrink-0"
                />
                <span>{pinnedLocationEntry.title}</span>
              </h3>
              <div className="dropdown dropdown-end">
                <div
                  className="tooltip tooltip-left"
                  data-tip="Drag or Click to reorder"
                >
                  <button
                    ref={dragBtnEltRef}
                    type="button"
                    class={`btn btn-sm btn-square ${dragBtnClassName} -mt-1 -mr-1`}
                  >
                    <GripVerticalIcon size={16} class="text-base-content/70" />
                  </button>
                </div>
                <ul
                  tabindex={-1}
                  class="dropdown-content menu menu-sm bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
                  style={{
                    visibility: isDragging.value ? "hidden" : "visible",
                  }}
                >
                  {moveOptions.map(({ moveType, text, icon, isDisabled }) => (
                    <li
                      key={moveType}
                      class={isDisabled
                        ? "menu-disabled cursor-not-allowed"
                        : ""}
                    >
                      <a
                        onClick={(e) =>
                          handleMoveClick(e, moveType, isDisabled)}
                      >
                        {icon}
                        {text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {!isTitleFormActive.value
              ? (
                <div class="mt-1">
                  <button
                    type="button"
                    class="btn btn-xs"
                    onClick={handleTitleEditToggle}
                  >
                    <PencilIcon size={12} />
                    Edit title
                  </button>
                </div>
              )
              : (
                <form
                  class="mt-3 px-3 py-2 rounded-sm shadow-md shadow-primary/20 bg-base-100 border border-base-content/10"
                  onSubmit={handleTitleEditSubmit}
                >
                  <fieldset class="fieldset">
                    <label
                      for={`edit-title-${pinnedLocationEntry.id}`}
                      class="label p-0 text-xs"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      id={`edit-title-${pinnedLocationEntry.id}`}
                      class={`input input-xs w-full ${
                        !titleInputValue.value.trim() ? "input-error" : ""
                      }`}
                      value={titleInputValue.value}
                      onInput={(e) =>
                        titleInputValue.value =
                          (e.target as HTMLInputElement).value}
                    />
                    {!titleInputValue.value.trim() && (
                      <span class="text-error text-xs leading-tight">
                        The pinned location title must not be empty
                      </span>
                    )}
                    <div class="flex items-center gap-x-2 mt-1.5">
                      <button
                        type="submit"
                        class="btn btn-xs btn-primary"
                        disabled={!titleInputValue.value.trim()}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs"
                        onClick={handleTitleEditCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
          </div>

          <div class="space-y-2 mt-1">
            <fieldset class="fieldset">
              <label
                for={`pinned-location-card-output-format-${pinnedLocationEntry.id}`}
                class="label"
              >
                Output format
              </label>
              <div>
                <select
                  id={`pinned-location-card-output-format-${pinnedLocationEntry.id}`}
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
            <section
              aria-labelledby={`pinned-location-card-title-${pinnedLocationEntry.id}`}
            >
              {!isCoordinatesFormActive.value
                ? (
                  <div class="flex items-center gap-x-2 py-1">
                    <div>
                      <h5
                        id={`pinned-location-card-title-${pinnedLocationEntry.id}`}
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
                )
                : null}

              {!isCoordinatesFormActive.value
                ? (
                  <div class="mt-1">
                    <button
                      type="button"
                      class="btn btn-xs"
                      onClick={handleCoordinatesEditToggle}
                    >
                      <PencilIcon size={12} />
                      Edit coordinates
                    </button>
                  </div>
                )
                : (
                  <form
                    class="mt-2 px-3 py-2 rounded-sm shadow-md shadow-primary/20 bg-base-100 border border-base-content/10"
                    onSubmit={handleCoordinatesEditSubmit}
                  >
                    <fieldset class="fieldset">
                      <label
                        for={`edit-coordinates-${pinnedLocationEntry.id}`}
                        class="label p-0 text-xs"
                      >
                        Coordinates
                      </label>
                      <input
                        type="text"
                        id={`edit-coordinates-${pinnedLocationEntry.id}`}
                        class={`input input-xs w-full ${
                          coordinatesInputError.value ? "input-error" : ""
                        }`}
                        placeholder="Geographic coordinates in any correct format"
                        value={coordinatesInputValue.value}
                        onInput={(e) => {
                          coordinatesInputValue.value =
                            (e.target as HTMLInputElement).value;
                          coordinatesInputError.value = false;
                        }}
                      />
                      {coordinatesInputError.value && (
                        <span class="text-error text-xs leading-tight">
                          Could not parse the coordinates being entered
                        </span>
                      )}
                      <div class="flex items-center gap-x-2 mt-1.5">
                        <button
                          type="submit"
                          class="btn btn-xs btn-primary"
                          disabled={!coordinatesInputValue.value.trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs"
                          onClick={handleCoordinatesEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}
            </section>

            <div class="flex items-center gap-x-3 pt-1">
              <fieldset class="fieldset">
                <label class="label text-xs text-base-content/90">
                  Lock marker
                  <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={pinnedLocationEntry.isLocked}
                    onChange={handleLockToggle}
                  />
                </label>
              </fieldset>
              {!pinnedLocationEntry.isLocked && (
                <div class="flex items-center">
                  <div class="badge badge-sm badge-primary">
                    <MoveIcon size={12} class="mr-1" />
                    Draggable
                  </div>
                </div>
              )}
            </div>
          </div>

          <PinsPagePinnedLocationCardFokontany
            className="mt-3"
            fokontany={pinnedLocationEntry.fokontany}
            isLoading={pinnedLocationEntry.isLoadingFokontany ?? false}
            errorCause={pinnedLocationEntry.fokontanyErrorCause}
          />

          <div class="flex items-start gap-x-1 mt-3 mb-4">
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
              onClick={handleDeleteClick}
            >
              <PinOffIcon size={14} />
              <span>Unpin location</span>
            </button>
          </div>
        </article>
      </div>
    </>
  );
}
