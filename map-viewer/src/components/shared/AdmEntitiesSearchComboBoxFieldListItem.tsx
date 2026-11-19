import {
  AdmEntity,
  Commune,
  District,
  Fokontany,
  Province,
  Region,
} from "@scope/types/models";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

export type SelectedAdmEntityValue = {
  admLevelCode: AdmLevelCode.PROVINCE;
  entity: Province;
} | {
  admLevelCode: AdmLevelCode.REGION;
  entity: Region;
} | {
  admLevelCode: AdmLevelCode.DISTRICT;
  entity: District;
} | {
  admLevelCode: AdmLevelCode.COMMUNE;
  entity: Commune;
} | {
  admLevelCode: AdmLevelCode.FOKONTANY;
  entity: Fokontany;
};

export type AdmEntitiesSearchComboBoxFieldListItemProps = {
  showAdmLevelCodeBadge?: boolean;
  isSelected?: boolean;
  admLevelCode: AdmLevelCode;
  entity: AdmEntity;
  id: string;
  typed: string;
  onMouseEnter?: () => void;
  onClick?: (value: SelectedAdmEntityValue) => void;
};

export default function AdmEntitiesSearchComboBoxFieldListItem(
  {
    isSelected,
    showAdmLevelCodeBadge,
    admLevelCode,
    entity,
    id,
    typed,
    onMouseEnter,
    onClick,
  }: AdmEntitiesSearchComboBoxFieldListItemProps,
) {
  const isHovered = useSignal(false);

  const elRef = useRef<HTMLLIElement>(null);

  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  const isVisible = useSignal(false);

  useEffect(() => {
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
          } else {
            isVisible.value = false;
          }
        });
      },
      {
        threshold: 1,
      },
    );
    if (elRef.current) {
      intersectionObserverRef.current.observe(elRef.current);
    }
    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isSelected) {
      !isHovered.value && !isVisible.value &&
        elRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isSelected]);

  function handleMouseEnter() {
    isHovered.value = true;
    onMouseEnter?.();
  }

  function handleMouseLeave() {
    isHovered.value = false;
  }

  let territory!: string, parentTerritory: string | null = null;
  let badgeClass: string = "";
  switch (admLevelCode) {
    case AdmLevelCode.PROVINCE:
      territory = (entity as Province).province;
      badgeClass = "badge-province";
      break;
    case AdmLevelCode.REGION:
      territory = (entity as Region).region;
      parentTerritory = (entity as Region).province;
      badgeClass = "badge-region";
      break;
    case AdmLevelCode.DISTRICT: {
      const _entity = entity as District;
      territory = _entity.district;
      parentTerritory = _entity.region;
      if (_entity.province) {
        parentTerritory += `, ${_entity.province}`;
      }
      badgeClass = "badge-district";
      break;
    }
    case AdmLevelCode.COMMUNE: {
      const _entity = entity as Commune;
      territory = _entity.commune;
      parentTerritory = _entity.district;
      if (_entity.region) {
        parentTerritory += `, ${_entity.region}`;
      }
      if (_entity.province) {
        parentTerritory += `, ${_entity.province}`;
      }
      badgeClass = "badge-commune";
      break;
    }
    case AdmLevelCode.FOKONTANY: {
      const _entity = entity as Fokontany;
      territory = _entity.fokontany;
      parentTerritory = _entity.commune;
      if (_entity.district) {
        parentTerritory += `, ${_entity.district}`;
      }
      if (_entity.region) {
        parentTerritory += `, ${_entity.region}`;
      }
      if (_entity.province) {
        parentTerritory += `, ${_entity.province}`;
      }
      badgeClass = "badge-fokontany";
      break;
    }
    default:
      throw new Error(
        `Unknown adm level code: ${admLevelCode satisfies never}`,
      );
  }

  const match = territory.match(new RegExp(`^${typed}`, "i"));
  const remainder = territory.substring(typed.length);

  let admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;
  admLevelTitle = admLevelTitle[0].toUpperCase() + admLevelTitle.slice(1);

  function handleClick() {
    onClick?.(
      {
        admLevelCode,
        entity,
      } as SelectedAdmEntityValue,
    );
  }

  return (
    <li
      ref={elRef}
      id={id}
      role="option"
      class={[
        "px-3 py-2 duration-300 cursor-pointer flex items-center gap-x-1",
        isSelected ? "bg-base-content/20" : "",
      ].join(" ")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div class="grow shrink basis-auto flex flex-col overflow-x-auto">
        <p class="truncate">
          {typed && match
            ? (
              <>
                {match[0]}
                <strong class="font-semibold">
                  {remainder}
                </strong>
              </>
            )
            : territory}
        </p>
        <p class="w-full text-xs text-base-content/70 truncate">
          {parentTerritory}
        </p>
      </div>
      {showAdmLevelCodeBadge && (
        <div class="tooltip tooltip-left" data-tip={admLevelTitle}>
          <div class={`badge ${badgeClass} badge-xs -mr-1`}>
            <em style="display: none;">{admLevelTitle}</em>
          </div>
        </div>
      )}
    </li>
  );
}
