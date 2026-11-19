import { useEffect, useRef } from "preact/hooks";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
} from "@scope/consts/models";
import { AdmEntity } from "@scope/types/models";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmEntitiesSearchComboBoxField, {
  SelectedAdmEntityValue,
} from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback.ts";
import {
  ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
  ADM_ENTITIES_SEARCH_MIN_LENGTH,
} from "@/config/adm-entities.config.ts";
import {
  GetAdmEntitiesInUnionRequestParams,
  injectAdmEntityApi,
} from "@/api/adm-entity.api.ts";
import { ApiCallPaginationParams } from "@/types/api.d.ts";
import { ADM_ENTITIES_COUNT } from "@/config/adm-entities.config.ts";

export default function AdmExplorerPageGlobalFiltering() {
  const startingAdmLevelCode = useSignal<AdmLevelCode>(
    AdmLevelCode.PROVINCE,
  );

  function handleStartingAdmLevelCodeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    startingAdmLevelCode.value = target.value as AdmLevelCode;
  }

  const apiStore = useStoresContext().injectApiStore();

  const searchValue = useSignal("");
  const selectedAdmEntityValue = useSignal<SelectedAdmEntityValue | null>(null);

  const apiAdmEntitiesAreLoaded = useSignal(false);
  const apiAdmEntitiesAreLoading = useSignal(false);
  const apiAdmEntities = useSignal<AdmEntity[]>([]);
  const apiAdmEntitiesNextCursor = useSignal<string | null>(null);
  const isLoadingMoreApiAdmEntities = useComputed(() => {
    return apiAdmEntitiesAreLoaded.value && apiAdmEntitiesAreLoading.value;
  });

  const admEntityApi = injectAdmEntityApi();

  const apiCallAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    apiCallAbortControllerRef.current?.abort();
  }, []);

  const debouncedHandleSearchValueChange = useDebouncedCallback<
    [ApiCallPaginationParams, GetAdmEntitiesInUnionRequestParams, boolean]
  >(
    async (paginationParams, queryParams, isFresh) => {
      try {
        apiCallAbortControllerRef.current?.abort();
        apiCallAbortControllerRef.current = new AbortController();
        isFresh && (apiAdmEntitiesAreLoaded.value = false);
        apiAdmEntitiesAreLoading.value = true;
        const paginatedAdmEntities = await admEntityApi.getAllInUnionPaginated(
          paginationParams,
          queryParams,
          {
            signal: apiCallAbortControllerRef.current.signal,
          },
        );
        apiAdmEntities.value = isFresh
          ? paginatedAdmEntities.records
          : [...apiAdmEntities.value, ...paginatedAdmEntities.records];
        apiAdmEntitiesNextCursor.value = paginatedAdmEntities.nextEncoded ??
          null;
        apiAdmEntitiesAreLoaded.value = true;
      } catch (e) {
        console.error(e);
      } finally {
        apiAdmEntitiesAreLoading.value = false;
      }
    },
    ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
  );

  const admEntities = useComputed<AdmEntity[]>(() => {
    if (searchValue.value.length >= ADM_ENTITIES_SEARCH_MIN_LENGTH) {
      return apiAdmEntities.value;
    }
    const entities: AdmEntity[] = [];
    const lowerCaseSearchValue = searchValue.value.toLocaleLowerCase("fr");
    if (startingAdmLevelCode.value === AdmLevelCode.PROVINCE) {
      const provinces = lowerCaseSearchValue
        ? apiStore.provinces.value.filter((p) => {
          return p.province.toLocaleLowerCase("fr").startsWith(
            lowerCaseSearchValue,
          );
        })
        : apiStore.provinces.value;
      let slicedProvinces = provinces.slice(0, ADM_ENTITIES_COUNT.GLOBAL_MODE);
      if (!apiStore.config.value?.hasAdmLevel) {
        slicedProvinces = slicedProvinces.map((p) => {
          return {
            ...p,
            admLevel: ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.PROVINCE)!,
          };
        });
      }
      entities.push(...slicedProvinces);
    }
    const startingAdmLevelCodeIndex = ADM_LEVEL_INDEX_BY_CODE.get(
      startingAdmLevelCode.value,
    )!;
    if (
      startingAdmLevelCodeIndex <=
        ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.REGION)!
    ) {
      const regions = lowerCaseSearchValue
        ? apiStore.regions.value.filter((r) => {
          return r.region.toLocaleLowerCase("fr").startsWith(
            lowerCaseSearchValue,
          );
        })
        : apiStore.regions.value;
      let slicedRegions = regions.slice(0, ADM_ENTITIES_COUNT.GLOBAL_MODE);
      if (!apiStore.config.value?.hasAdmLevel) {
        slicedRegions = slicedRegions.map((r) => {
          return {
            ...r,
            admLevel: ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.REGION)!,
          };
        });
      }
      entities.push(...slicedRegions);
    }
    if (
      startingAdmLevelCodeIndex <=
        ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.DISTRICT)!
    ) {
      const districts = lowerCaseSearchValue
        ? apiStore.districts.value.filter((c) => {
          return c.district.toLocaleLowerCase("fr").startsWith(
            lowerCaseSearchValue,
          );
        })
        : apiStore.districts.value;
      let slicedDistricts = districts.slice(0, ADM_ENTITIES_COUNT.GLOBAL_MODE);
      if (!apiStore.config.value?.hasAdmLevel) {
        slicedDistricts = slicedDistricts.map((d) => {
          return {
            ...d,
            admLevel: ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.DISTRICT)!,
          };
        });
      }
      entities.push(...slicedDistricts);
    }
    if (
      startingAdmLevelCodeIndex <=
        ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.COMMUNE)!
    ) {
      const communes = lowerCaseSearchValue
        ? apiStore.communes.value.filter((c) => {
          return c.commune.toLocaleLowerCase("fr").startsWith(
            lowerCaseSearchValue,
          );
        })
        : apiStore.communes.value;
      let slicedCommunes = communes.slice(0, ADM_ENTITIES_COUNT.GLOBAL_MODE);
      if (!apiStore.config.value?.hasAdmLevel) {
        slicedCommunes = slicedCommunes.map((c) => {
          return {
            ...c,
            admLevel: ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.COMMUNE)!,
          };
        });
      }
      entities.push(...slicedCommunes);
    }
    const fokontanys = lowerCaseSearchValue
      ? apiStore.fokontanys.value.filter((f) => {
        return f.fokontany.toLocaleLowerCase("fr").startsWith(
          lowerCaseSearchValue,
        );
      })
      : apiStore.fokontanys.value;
    let slicedFokontanys = fokontanys.slice(0, ADM_ENTITIES_COUNT.GLOBAL_MODE);
    if (!apiStore.config.value?.hasAdmLevel) {
      slicedFokontanys = slicedFokontanys.map((f) => {
        return {
          ...f,
          admLevel: ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.FOKONTANY)!,
        };
      });
    }
    entities.push(...slicedFokontanys);
    return entities;
  });

  useSignalEffect(() => {
    const search = searchValue.value;
    if (search.length >= ADM_ENTITIES_SEARCH_MIN_LENGTH) {
      debouncedHandleSearchValueChange(
        { limit: ADM_ENTITIES_COUNT.GLOBAL_MODE },
        {
          from: startingAdmLevelCode.value,
          search,
        },
        true,
      );
    }
  });

  function handleComboboxScrollEnd() {
    const search = searchValue.value;
    if (
      search.length >= ADM_ENTITIES_SEARCH_MIN_LENGTH &&
      apiAdmEntitiesAreLoaded.value && apiAdmEntitiesNextCursor.value &&
      !apiAdmEntitiesAreLoading.value
    ) {
      const paginationParams: ApiCallPaginationParams = {
        limit: ADM_ENTITIES_COUNT.GLOBAL_MODE,
      };
      apiAdmEntitiesNextCursor.value &&
        (paginationParams.cursor = apiAdmEntitiesNextCursor.value);
      debouncedHandleSearchValueChange(
        paginationParams,
        {
          from: startingAdmLevelCode.value,
          search,
        },
        false,
      );
    }
  }

  const searchFieldPlaceholder = useComputed<string>(() => {
    if (startingAdmLevelCode.value === AdmLevelCode.FOKONTANY) {
      return "Type any fokontany";
    }
    const startingLevel = ADM_LEVEL_TITLE_BY_CODE.get(
      startingAdmLevelCode.value,
    )!;
    return `From any ${startingLevel} to any fokontany`;
  });

  return (
    <section>
      <form class="space-y-3 pb-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            Start from an administrative level
          </legend>
          <select
            value={startingAdmLevelCode.value}
            class="select select-bordered capitalize w-full"
            onChange={handleStartingAdmLevelCodeChange}
          >
            {ADM_LEVEL_CODES_INDEXED.map((admLevelCode) => {
              const admTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;
              const label = `${admTitle[0].toUpperCase()}${admTitle.slice(1)}s`;
              return (
                <option
                  key={admLevelCode}
                  value={admLevelCode}
                >
                  {label}
                </option>
              );
            })}
          </select>
        </fieldset>
        <AdmEntitiesSearchComboBoxField
          legend="Search for a territory"
          placeholder={searchFieldPlaceholder.value}
          entities={admEntities.value}
          inputValue={searchValue.value}
          selectedAdmEntityValue={selectedAdmEntityValue.value}
          selectedWithParents
          isLoadingMore={isLoadingMoreApiAdmEntities.value}
          onInputChange={(value) => searchValue.value = value}
          onSelected={(value) => selectedAdmEntityValue.value = value}
          onSelectedClose={() => selectedAdmEntityValue.value = null}
          onScrollEnd={handleComboboxScrollEnd}
        />
      </form>
    </section>
  );
}
