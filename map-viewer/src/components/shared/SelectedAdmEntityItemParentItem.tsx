import { useEffect, useRef } from "preact/hooks";
import { TargetedMouseEvent } from "preact";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { AdmEntityDiscriminated } from "@scope/types/models";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmPill from "@/components/shared/AdmPill.tsx";
import { AdmEntityDivisionWithEntry } from "@/stores/app-map.store.ts";

export type SelectedAdmEntityItemParentItemProps = {
  value: AdmEntityDiscriminated;
  hideShowOnMapToggle: boolean;
  toggleClassName: string;
  parentValue: AdmEntityDivisionWithEntry;
  toggleIsDisabled: boolean;
  size?: "md" | "sm";
  onClick?: (admLevelCode: AdmLevelCode) => void | Promise<void>;
  onToggleChange?: (admLevelCode: AdmLevelCode, toggle: boolean) => void;
};

export default function SelectedAdmEntityItemParentItem(
  {
    hideShowOnMapToggle,
    parentValue,
    toggleClassName,
    toggleIsDisabled,
    size,
    onClick,
    onToggleChange,
  }: SelectedAdmEntityItemParentItemProps,
) {
  const appMapStore = useStoresContext().injectAppMapStore();

  useEffect(
    () => {
      const _parentValue = parentValue;
      if (!_parentValue.isLoading) {
        const geojsonEntry = appMapStore.getAdmEntityEntryByNameMapByLevel(
          _parentValue.admLevelCode,
        ).get(_parentValue.name) ?? null;
        if (geojsonEntry) {
          appMapStore.referenceAdmEntityGeoJsonEntryByName(
            parentValue.admLevelCode,
            geojsonEntry.name,
          );
          return () => {
            const updatedGeojsonEntry = appMapStore
              .referenceAdmEntityGeoJsonEntryByName(
                parentValue.admLevelCode,
                geojsonEntry.name,
                false,
              );
            if (
              updatedGeojsonEntry?.isRendered &&
              updatedGeojsonEntry?.refsCount <= 1 &&
              updatedGeojsonEntry.admEntityDiscriminated
            ) {
              appMapStore.renderAdmEntityGeoJsonEntryByName(
                updatedGeojsonEntry.admEntityDiscriminated.admLevelCode,
                updatedGeojsonEntry.name,
                false,
              );
            }
          };
        }
      }
    },
    [
      parentValue.admLevelCode,
      parentValue.name,
      parentValue.isLoading,
    ],
  );

  const toggleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toggleRef.current) {
      if (parentValue.isLoading) {
        toggleRef.current.indeterminate = true;
      } else {
        toggleRef.current.indeterminate = false;
        toggleRef.current.checked = parentValue.isRendered;
      }
    }
  }, [parentValue.isLoading, parentValue.isRendered]);

  function handleToggleChange(e: TargetedMouseEvent<HTMLInputElement>) {
    e.preventDefault();
    if (!parentValue.isLoading) {
      onToggleChange?.(parentValue.admLevelCode, e.currentTarget.checked);
    }
  }

  const _toggleClassName = toggleClassName +
    (size === "md" ? " toggle-md" : " toggle-sm");

  return (
    <div class="py-1 pl-1 bg-white relative z-10">
      <em class="not-italic text-xs text-base-content/70 capitalize inline-block mb-1">
        {ADM_LEVEL_TITLE_BY_CODE.get(parentValue.admLevelCode)!}:
      </em>
      <div class="flex items-between gap-x-3">
        <div class="grow shrink basis-auto truncate">
          <AdmPill
            admLevelCode={parentValue.admLevelCode}
            text={parentValue.text}
            size={size}
            value={parentValue}
            onClick={() => onClick?.(parentValue.admLevelCode)}
          />
        </div>
        {!hideShowOnMapToggle && (
          <div class="flex items-center">
            <div
              class="tooltip tooltip-left"
              data-tip={parentValue.isRendered
                ? "Remove from map"
                : "Show on map"}
            >
              <input
                ref={toggleRef}
                type="checkbox"
                checked={parentValue.isRendered}
                disabled={toggleIsDisabled}
                class={`toggle ${_toggleClassName}`}
                onClick={handleToggleChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
