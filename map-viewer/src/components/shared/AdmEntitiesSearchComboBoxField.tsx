import { useEffect, useRef } from "preact/hooks";
import {
  Signal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { autoUpdate, computePosition, flip, offset } from "@floating-ui/dom";
import SimpleBar from "simplebar";
import type { AdmEntity } from "@scope/types/models";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";
import AdmEntitiesSearchComboBoxFieldListItem, {
  SelectedAdmEntityValue,
} from "@/components/shared/AdmEntitiesSearchComboBoxFieldListItem.tsx";
import SelectedAdmEntityItem from "@/components/shared/SelectedAdmEntityItem.tsx";
export type { SelectedAdmEntityValue } from "@/components/shared/AdmEntitiesSearchComboBoxFieldListItem.tsx";
import { getAdmEntityValue } from "@/helpers/adm-entity.helper.ts";

export type AdmEntitiesSearchComboBoxFieldProps = {
  legend: string;
  placeholder: string;
  admLevelCode?: AdmLevelCode;
  entities: AdmEntity[];
  isLoadingMore?: boolean;
  inputValue: string;
  inputDirectValue?: Signal<string>;
  selectedAdmEntityValue?: SelectedAdmEntityValue | null;
  selectedWithParents?: boolean;
  disabled?: boolean;
  inputTooltipText?: string | null;
  onSelected?: (value: SelectedAdmEntityValue) => void;
  onSelectedClose?: () => void;
  onScrollEnd?: () => void;
  onInputChange?: (value: string) => void;
};

export default function AdmEntitiesSearchComboBoxField({
  legend,
  placeholder,
  admLevelCode,
  entities,
  isLoadingMore,
  inputValue,
  inputDirectValue = useSignal(""),
  selectedAdmEntityValue,
  selectedWithParents = false,
  disabled = false,
  inputTooltipText = null,
  onSelected,
  onSelectedClose,
  onScrollEnd,
  onInputChange,
}: AdmEntitiesSearchComboBoxFieldProps) {
  const onScrollEndRef = useRef(onScrollEnd);
  onScrollEndRef.current = onScrollEnd;

  const showMenu = useSignal(false);
  const selectedItemIndex = useSignal(-1);
  const inputActiveDescendent = useComputed(() => {
    if (selectedItemIndex.value >= 0) {
      const entity = entities[selectedItemIndex.value];
      let entityAdmLevelCode!: AdmLevelCode;
      if (admLevelCode) {
        entityAdmLevelCode = admLevelCode;
      } else {
        if (typeof entity.admLevel === "undefined") {
          throw new Error(
            "entity.admLevel is undefined in `AdmEntitiesSearchComboBoxField`",
          );
        }
        entityAdmLevelCode = ADM_LEVEL_CODES_INDEXED[entity.admLevel];
      }
      return getListItemId(entityAdmLevelCode, entity);
    } else return undefined;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const idRef = useRef<string>(Date.now().toString());
  const listIdRef = useRef<string>(`${idRef.current}-list`);
  const menuNameRef = useRef<string>(`menu-${idRef.current}`);

  // @ts-ignore - SimpleBar typings are wrong
  const simpleBarInstance = useRef<SimpleBar>(null);

  useEffect(() => {
    if (showMenu.value) {
      if (!inputRef.current || !menuRef.current) return;
      const cleanup = autoUpdate(
        inputRef.current,
        menuRef.current,
        updateMenuPosition,
      );

      document.addEventListener("mousedown", handleClickOutsideWrapper);
      document.addEventListener("focusin", handleFocusOutsideWrapper);

      menuListRef.current?.classList.remove("overflow-y-hidden");
      // @ts-ignore - SimpleBar typings are wrong
      const menuListSimpleBar = new SimpleBar(menuListRef.current);
      simpleBarInstance.current = menuListSimpleBar;

      return () => {
        cleanup();
        document.removeEventListener("mousedown", handleClickOutsideWrapper);
        document.removeEventListener("focusin", handleFocusOutsideWrapper);

        menuListSimpleBar.unMount();
      };
    } else {
      inputRef.current?.blur();
    }
  }, [showMenu.value, entities, isLoadingMore]);

  useEffect(() => {
    if (showMenu.value) {
      document.addEventListener("keydown", handleMenuOpenKeydown);
      return () => {
        document.removeEventListener("keydown", handleMenuOpenKeydown);
      };
    }
  }, [showMenu.value, entities]);

  useEffect(() => {
    function handleClickOustideWrapper(e: MouseEvent) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
      ) {
        showMenu.value = false;
      }
    }

    document.addEventListener("click", handleClickOustideWrapper);
    return () => {
      document.removeEventListener("click", handleClickOustideWrapper);
    };
  }, []);

  const endOfScrollRef = useRef<HTMLLIElement>(null);
  const endOfScrollObserver = useRef<IntersectionObserver>(null);

  useSignalEffect(() => {
    if (showMenu.value && endOfScrollRef.current) {
      if (!endOfScrollObserver.current) {
        endOfScrollObserver.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                onScrollEndRef.current?.();
              }
            });
          },
          { rootMargin: "80px 0px 0px 0px" },
        );
      }
      endOfScrollObserver.current.observe(endOfScrollRef.current);
      return () => {
        endOfScrollObserver.current?.disconnect();
      };
    }
  });

  function updateMenuPosition() {
    if (!inputRef.current || !menuRef.current) return;
    computePosition(inputRef.current, menuRef.current, {
      placement: "bottom-start",
      middleware: [offset(6), flip()],
    }).then(({ x, y }) => {
      if (menuRef.current) {
        Object.assign(menuRef.current.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      }
    });
  }

  useEffect(() => {
    selectedItemIndex.value = -1;
    const scrollableEl = simpleBarInstance.current
      ?.getScrollElement() as HTMLDivElement;
    scrollableEl && (scrollableEl.scrollTop = 0);
  }, [inputValue]);

  function handleInputFocus() {
    showMenu.value = true;
  }

  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    inputDirectValue.value = target.value;
    onInputChange?.(target.value);
    !showMenu.value && (showMenu.value = true);
  }

  function handleClose() {
    inputDirectValue.value = "";
    onInputChange?.("");
    onSelectedClose?.();
  }

  function handleItemMouseEnter(index: number) {
    selectedItemIndex.value = index;
  }

  function handleItemClick(value: SelectedAdmEntityValue) {
    const admEntityValue = getAdmEntityValue(value.entity, value.admLevelCode);
    inputDirectValue.value = admEntityValue;
    onInputChange?.(admEntityValue);
    onSelected?.(value);
    showMenu.value = false;
  }

  function handleClickOutsideWrapper(e: MouseEvent) {
    if (
      wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
    ) {
      showMenu.value = false;
    }
  }

  function handleFocusOutsideWrapper(e: FocusEvent) {
    if (
      wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
    ) {
      showMenu.value = false;
    }
  }

  function getListItemId(admLevelCode: AdmLevelCode, entity: AdmEntity) {
    return `${admLevelCode}-${entity.id}`;
  }

  function handleMenuOpenKeydown(e: KeyboardEvent) {
    const entitiesLength = entities.length;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();

        const indexLeap = e.key === "ArrowDown" ? 1 : -1;
        let index = selectedItemIndex.value + indexLeap;
        if (index < -1) {
          index = entitiesLength - 1;
        } else if (index >= entitiesLength) {
          index = -1;
        }

        selectedItemIndex.value = index;
        if (index === -1) {
          inputRef.current?.focus();
        } else {
          const entity = entities[index];
          const entityAdmLevelCode = admLevelCode ??
            ADM_LEVEL_CODES_INDEXED[entity.admLevel!];
          const value = getAdmEntityValue(entity, entityAdmLevelCode);
          inputDirectValue.value = value;
        }

        break;
      }

      case "Enter": {
        e.preventDefault();
        if (selectedItemIndex.value !== -1) {
          const entity = entities[selectedItemIndex.value];
          const entityAdmLevelCode = admLevelCode ??
            ADM_LEVEL_CODES_INDEXED[entity.admLevel!];
          const value = getAdmEntityValue(entity, entityAdmLevelCode);
          inputDirectValue.value = value;
          onInputChange?.(value);
          onSelected?.(
            {
              entity,
              admLevelCode: entityAdmLevelCode,
            } as SelectedAdmEntityValue,
          );
          showMenu.value = false;
        }
        break;
      }

      case "Escape": {
        e.preventDefault();
        showMenu.value = false;
        break;
      }

      case "Home":
      case "End": {
        e.preventDefault();
        if (entities.length === 0) break;
        const index = e.key === "Home" ? 0 : entities.length - 1;
        selectedItemIndex.value = index;
        const entity = entities[index];
        const entityAdmLevelCode = admLevelCode ??
          ADM_LEVEL_CODES_INDEXED[entity.admLevel!];
        const value = getAdmEntityValue(entity, entityAdmLevelCode);
        inputDirectValue.value = value;
        break;
      }

      default: {
        // 1. Check if the key value is exactly 1 character long
        const isPrintable = e.key.length === 1;

        // 2. Exclude system shortcut modifiers (Ctrl, Cmd, Alt)
        const isShortcut = e.ctrlKey || e.metaKey || e.altKey;

        if (isPrintable && !isShortcut) {
          inputRef.current?.focus();
        }
        break;
      }
    }
  }

  return (
    <fieldset class="fieldset bg-white" style="display: block; min-width: 0">
      <legend id={idRef.current} class="fieldset-legend">{legend}</legend>
      <div ref={wrapperRef} class="relative">
        <div
          class={`${inputTooltipText ? "tooltip tooltip-top" : ""} w-full`}
        >
          <div class="tooltip-content z-30">
            {inputTooltipText}
          </div>
          <input
            ref={inputRef}
            type="search"
            name={menuNameRef.current}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showMenu.value ? "true" : "false"}
            aria-controls={listIdRef.current}
            aria-haspopup="listbox"
            aria-labelledby={idRef.current}
            aria-activedescendant={inputActiveDescendent.value}
            disabled={disabled}
            placeholder={placeholder}
            value={inputDirectValue.value}
            class="input w-full"
            onFocus={handleInputFocus}
            onInput={handleInputChange}
          />
        </div>
        {showMenu.value && (
          <div
            ref={menuRef}
            class="bg-base-100 rounded-sm shadow py-1 border border-base-content/20 border-solid text-sm absolute top-0 left-0 w-full z-20"
            style={{
              visibility: entities.length > 0 || isLoadingMore
                ? "visible"
                : "hidden",
            }}
          >
            <div
              ref={menuListRef}
              class="overflow-y-hidden"
              style="max-height: 13.625rem;"
            >
              <ul
                id={listIdRef.current}
                role="listbox"
                aria-labelledby={idRef.current}
              >
                {entities.map((entity, index) => {
                  let entityAdmLevelCode!: AdmLevelCode;
                  if (admLevelCode) {
                    entityAdmLevelCode = admLevelCode;
                  } else {
                    if (typeof entity.admLevel === "undefined") {
                      throw new Error(
                        "entity.admLevel is undefined in `AdmEntitiesSearchComboBoxField`",
                      );
                    }
                    entityAdmLevelCode =
                      ADM_LEVEL_CODES_INDEXED[entity.admLevel];
                  }
                  const id = getListItemId(entityAdmLevelCode, entity);
                  const isSelected = selectedItemIndex.value === index;
                  return (
                    <AdmEntitiesSearchComboBoxFieldListItem
                      key={id}
                      id={id}
                      showAdmLevelCodeBadge={!admLevelCode}
                      admLevelCode={entityAdmLevelCode}
                      entity={entity}
                      isSelected={isSelected}
                      typed={inputValue}
                      onMouseEnter={() => handleItemMouseEnter(index)}
                      onClick={handleItemClick}
                    />
                  );
                })}
                {isLoadingMore && (
                  <li class="flex justify-center py-2">
                    <span class="loading loading-spinner loading-md"></span>
                  </li>
                )}
                <li ref={endOfScrollRef}></li>
              </ul>
            </div>
          </div>
        )}
      </div>
      {selectedAdmEntityValue && (
        <div class="mt-2 bg-inherit">
          <SelectedAdmEntityItem
            value={selectedAdmEntityValue}
            withParents={selectedWithParents}
            onClose={handleClose}
          />
        </div>
      )}
    </fieldset>
  );
}
