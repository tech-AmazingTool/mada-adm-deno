import { useEffect, useMemo, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  AdmEntityDiscriminated,
  District,
  Province,
  Region,
} from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmEntitiesSearchComboBoxField from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback.ts";
import { ApiCallPaginationParams } from "@/types/api.d.ts";
import {
  GetDistrictsPaginatedRequestParams,
  injectDistrictApi,
} from "@/api/district.api.ts";
import {
  ADM_ENTITIES_COUNT,
  ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
} from "@/config/adm-entities.config.ts";

export type AdmExplorerPageCascadeFilteringDistrictProps = {
  selectedProvince: Province | null;
  selectedRegion: Region | null;
  selectedDistrict: District | null;
  onSelectedChange?: (province: District | null) => void;
};

export default function AdmExplorerPageCascadeFilteringDistrict({
  selectedProvince,
  selectedRegion,
  selectedDistrict,
  onSelectedChange,
}: AdmExplorerPageCascadeFilteringDistrictProps) {
  const selectedDistrictDiscriminated = useMemo<AdmEntityDiscriminated | null>(
    () => {
      return selectedDistrict
        ? {
          admLevelCode: AdmLevelCode.DISTRICT,
          entity: selectedDistrict,
        }
        : null;
    },
    [selectedDistrict],
  );

  function handleSelectedChange(value: AdmEntityDiscriminated) {
    if (value.admLevelCode === AdmLevelCode.DISTRICT) {
      onSelectedChange?.(value.entity);
    }
  }

  const apiStore = useStoresContext().injectApiStore();

  const search = useSignal("");
  const directSearch = useSignal("");

  const apiDistricts = useSignal<District[]>([]);
  const apiDistrictsNextCursor = useSignal<string | null>(null);
  const apiDistrictsAreLoading = useSignal(false);
  const apiDistrictsAreLoaded = useSignal(false);

  const districtApi = injectDistrictApi();

  const apiCallAbortControllerRef = useRef<AbortController | null>(null);

  function shouldUseLocalApiDistricts(search?: string): boolean {
    return !!search || (!search && (!!selectedRegion || !!selectedProvince));
  }

  const fetchDistrictsDebouncedCb = useDebouncedCallback<
    [
      ApiCallPaginationParams,
      GetDistrictsPaginatedRequestParams,
      boolean,
    ]
  >(
    async (paginationParams, queryParams, isFirstLoad) => {
      try {
        const _shouldUseLocalApiDistricts = shouldUseLocalApiDistricts(
          queryParams.search,
        );
        if (isFirstLoad && _shouldUseLocalApiDistricts) {
          apiDistrictsAreLoaded.value = false;
        }
        apiDistrictsAreLoading.value = true;
        apiCallAbortControllerRef.current?.abort();
        apiCallAbortControllerRef.current = new AbortController();
        const paginatedDistricts = await districtApi.getManyPaginated(
          paginationParams,
          queryParams,
          { signal: apiCallAbortControllerRef.current.signal },
        );
        if (_shouldUseLocalApiDistricts) {
          apiDistricts.value = isFirstLoad
            ? paginatedDistricts.records
            : [...apiDistricts.value, ...paginatedDistricts.records];
          apiDistrictsNextCursor.value = paginatedDistricts.nextEncoded ?? null;
          apiDistrictsAreLoaded.value = true;
        } else {
          apiStore.districts.value = [
            ...apiStore.districts.value,
            ...paginatedDistricts.records,
          ];
          apiStore.districtsNextCursor.value = paginatedDistricts.nextEncoded ??
            null;
        }
      } catch (error) {
        console.error(error);
      } finally {
        apiDistrictsAreLoading.value = false;
      }
    },
    ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
  );

  const disabledReason = useMemo<string | null>(() => {
    const config = apiStore.config.value;
    if (
      !selectedRegion && selectedProvince && config &&
      !config.isProvinceFkRepeated
    ) {
      return "The province id foreign key is not supported by the districts based on the database configuration.";
    }
    return null;
  }, [apiStore.config.value, selectedProvince, selectedRegion]);

  function buildApiCallRequestParams(
    search: string,
  ): GetDistrictsPaginatedRequestParams {
    const reqParams: GetDistrictsPaginatedRequestParams = {
      search: search,
    };
    if (selectedRegion?.id) {
      reqParams.regionId = selectedRegion.id;
    } else if (selectedProvince?.id) {
      reqParams.provinceId = selectedProvince.id;
    }
    return reqParams;
  }

  useEffect(
    () => {
      if (disabledReason || !shouldUseLocalApiDistricts(search.value)) return;
      fetchDistrictsDebouncedCb(
        { limit: ADM_ENTITIES_COUNT.CASCADE_MODE },
        buildApiCallRequestParams(search.value),
        true,
      );
    },
    [disabledReason, search.value, selectedRegion, selectedProvince],
  );

  async function handleScrollEnd() {
    if (disabledReason) return;
    const _shouldUseLocalApiDistricts = shouldUseLocalApiDistricts(
      search.value,
    );
    if (_shouldUseLocalApiDistricts) {
      if (apiDistrictsAreLoaded.value && !apiDistrictsNextCursor.value) return;
    } else if (
      apiStore.districtsAreLoaded.value && !apiStore.districtsNextCursor.value
    ) return;
    const paginationParams: ApiCallPaginationParams = {
      limit: ADM_ENTITIES_COUNT.CASCADE_MODE,
    };
    const nextCursor = _shouldUseLocalApiDistricts
      ? apiDistrictsNextCursor.value
      : apiStore.districtsNextCursor.value;
    if (nextCursor) {
      paginationParams.cursor = nextCursor;
    }
    await fetchDistrictsDebouncedCb(
      paginationParams,
      buildApiCallRequestParams(search.value),
      false,
    );
  }

  useEffect(() => {
    return () => {
      apiCallAbortControllerRef.current?.abort();
      fetchDistrictsDebouncedCb.cancel();
    };
  }, []);

  const districts = useMemo(
    () => {
      if (shouldUseLocalApiDistricts(search.value)) {
        return apiDistricts.value;
      }
      if (selectedRegion) {
        return apiStore.districts.value.filter((d) => {
          return d.regionId === selectedRegion.id;
        });
      }
      if (selectedProvince && apiStore.config.value?.isProvinceFkRepeated) {
        return apiStore.districts.value.filter((d) => {
          return d.provinceId! === selectedProvince.id;
        });
      }
      return apiStore.districts.value;
    },
    [
      apiStore.config.value,
      search.value,
      apiDistricts.value,
      apiStore.districts.value,
      selectedRegion,
      selectedProvince,
    ],
  );

  function clearField() {
    onSelectedChange?.(null);
    search.value = "";
    directSearch.value = "";
  }

  useEffect(() => {
    if (selectedRegion || selectedProvince) {
      clearField();
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedProvince) {
      clearField();
    }
  }, [selectedProvince]);

  let placeholder = "Any district";
  if (selectedRegion) {
    placeholder += ` in "${selectedRegion.region}" region`;
  } else if (selectedProvince) {
    placeholder += ` in "${selectedProvince.province}" province`;
  }

  const isLoadingMore =
    (shouldUseLocalApiDistricts(search.value)
      ? apiDistrictsAreLoaded.value
      : apiStore.districtsAreLoaded.value) &&
    apiDistrictsAreLoading.value;

  return (
    <AdmEntitiesSearchComboBoxField
      admLevelCode={AdmLevelCode.DISTRICT}
      entities={districts}
      inputValue={search.value}
      inputDirectValue={directSearch}
      legend="Search for districts"
      placeholder={placeholder}
      selectedAdmEntityValue={selectedDistrictDiscriminated}
      isLoadingMore={isLoadingMore}
      disabled={!!disabledReason}
      inputTooltipText={disabledReason}
      onInputChange={(v) => search.value = v}
      onSelected={handleSelectedChange}
      onSelectedClose={() => onSelectedChange?.(null)}
      onScrollEnd={handleScrollEnd}
    />
  );
}
