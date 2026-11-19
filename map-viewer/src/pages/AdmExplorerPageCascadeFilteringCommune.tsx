import { useEffect, useMemo, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  AdmEntityDiscriminated,
  Commune,
  District,
  Province,
  Region,
} from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import AdmEntitiesSearchComboBoxField from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback.ts";
import { ApiCallPaginationParams } from "@/types/api.d.ts";
import {
  GetCommunesPaginatedRequestParams,
  injectCommuneApi,
} from "@/api/commune.api.ts";
import {
  ADM_ENTITIES_COUNT,
  ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
} from "@/config/adm-entities.config.ts";

export type AdmExplorerPageCascadeFilteringCommuneProps = {
  selectedProvince: Province | null;
  selectedRegion: Region | null;
  selectedDistrict: District | null;
  selectedCommune: Commune | null;
  onSelectedChange?: (commune: Commune | null) => void;
};

export default function AdmExplorerPageCascadeFilteringCommune({
  selectedProvince,
  selectedRegion,
  selectedDistrict,
  selectedCommune,
  onSelectedChange,
}: AdmExplorerPageCascadeFilteringCommuneProps) {
  const selectedCommuneDiscriminated = useMemo<AdmEntityDiscriminated | null>(
    () => {
      return selectedCommune
        ? {
          admLevelCode: AdmLevelCode.COMMUNE,
          entity: selectedCommune,
        }
        : null;
    },
    [selectedCommune],
  );

  function handleSelectedChange(value: AdmEntityDiscriminated) {
    if (value.admLevelCode === AdmLevelCode.COMMUNE) {
      onSelectedChange?.(value.entity);
    }
  }

  const apiStore = useStoresContext().injectApiStore();

  const search = useSignal("");
  const directSearch = useSignal("");

  const apiCommunes = useSignal<Commune[]>([]);
  const apiCommunesNextCursor = useSignal<string | null>(null);
  const apiCommunesAreLoading = useSignal(false);
  const apiCommunesAreLoaded = useSignal(false);

  const communeApi = injectCommuneApi();

  const apiCallAbortControllerRef = useRef<AbortController | null>(null);

  function shouldUseLocalApiCommunes(search?: string): boolean {
    return !!search ||
      (!search &&
        (!!selectedDistrict || !!selectedRegion || !!selectedProvince));
  }

  const fetchCommunesDebouncedCb = useDebouncedCallback<
    [
      ApiCallPaginationParams,
      GetCommunesPaginatedRequestParams,
      boolean,
    ]
  >(
    async (paginationParams, queryParams, isFirstLoad) => {
      try {
        const _shouldUseLocalApiCommunes = shouldUseLocalApiCommunes(
          queryParams.search,
        );
        if (isFirstLoad && _shouldUseLocalApiCommunes) {
          apiCommunesAreLoaded.value = false;
        }
        apiCommunesAreLoading.value = true;
        apiCallAbortControllerRef.current?.abort();
        apiCallAbortControllerRef.current = new AbortController();
        const paginatedCommunes = await communeApi.getManyPaginated(
          paginationParams,
          queryParams,
          { signal: apiCallAbortControllerRef.current.signal },
        );
        if (_shouldUseLocalApiCommunes) {
          apiCommunes.value = isFirstLoad
            ? paginatedCommunes.records
            : [...apiCommunes.value, ...paginatedCommunes.records];
          apiCommunesNextCursor.value = paginatedCommunes.nextEncoded ?? null;
          apiCommunesAreLoaded.value = true;
        } else {
          apiStore.communes.value = [
            ...apiStore.communes.value,
            ...paginatedCommunes.records,
          ];
          apiStore.communesNextCursor.value = paginatedCommunes.nextEncoded ??
            null;
        }
      } catch (error) {
        console.error(error);
      } finally {
        apiCommunesAreLoading.value = false;
      }
    },
    ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
  );

  const disabledReason = useMemo<string | null>(() => {
    const config = apiStore.config.value;
    if (config && !selectedDistrict) {
      if (selectedRegion && !config.isFkRepeated) {
        return "The region id foreign key is not supported by the communes based on the database configuration.";
      } else if (
        selectedProvince && !config.isProvinceFkRepeated && !selectedRegion
      ) {
        return "The province id foreign key is not supported by the communes based on the database configuration.";
      }
    }
    return null;
  }, [
    apiStore.config.value,
    selectedProvince,
    selectedRegion,
    selectedDistrict,
  ]);

  function buildApiCallRequestParams(
    search: string,
  ): GetCommunesPaginatedRequestParams {
    const reqParams: GetCommunesPaginatedRequestParams = {
      search: search,
    };
    if (selectedDistrict?.id) {
      reqParams.districtId = selectedDistrict.id;
    } else if (selectedRegion?.id) {
      reqParams.regionId = selectedRegion.id;
    } else if (selectedProvince?.id) {
      reqParams.provinceId = selectedProvince.id;
    }
    return reqParams;
  }

  useEffect(
    () => {
      if (disabledReason || !shouldUseLocalApiCommunes(search.value)) return;
      fetchCommunesDebouncedCb(
        { limit: ADM_ENTITIES_COUNT.CASCADE_MODE },
        buildApiCallRequestParams(search.value),
        true,
      );
    },
    [
      disabledReason,
      search.value,
      selectedDistrict,
      selectedRegion,
      selectedProvince,
    ],
  );

  async function handleScrollEnd() {
    if (disabledReason) return;
    const _shouldUseLocalApiCommunes = shouldUseLocalApiCommunes(search.value);
    if (_shouldUseLocalApiCommunes) {
      if (apiCommunesAreLoaded.value && !apiCommunesNextCursor.value) return;
    } else if (
      apiStore.communesAreLoaded.value && !apiStore.communesNextCursor.value
    ) return;
    const paginationParams: ApiCallPaginationParams = {
      limit: ADM_ENTITIES_COUNT.CASCADE_MODE,
    };
    const nextCursor = _shouldUseLocalApiCommunes
      ? apiCommunesNextCursor.value
      : apiStore.communesNextCursor.value;
    if (nextCursor) {
      paginationParams.cursor = nextCursor;
    }
    await fetchCommunesDebouncedCb(
      paginationParams,
      buildApiCallRequestParams(search.value),
      false,
    );
  }

  useEffect(() => {
    return () => {
      apiCallAbortControllerRef.current?.abort();
      fetchCommunesDebouncedCb.cancel();
    };
  }, []);

  const communes = useMemo(
    () => {
      if (shouldUseLocalApiCommunes(search.value)) {
        return apiCommunes.value;
      }
      const config = apiStore.config.value;
      if (selectedDistrict) {
        return apiStore.communes.value.filter((c) => {
          return c.districtId === selectedDistrict.id;
        });
      }
      if (selectedRegion && config?.isFkRepeated) {
        return apiStore.communes.value.filter((c) => {
          return c.regionId! === selectedRegion.id;
        });
      }
      if (selectedProvince && config?.isProvinceFkRepeated) {
        return apiStore.communes.value.filter((c) => {
          return c.provinceId! === selectedProvince.id;
        });
      }
      return apiStore.communes.value;
    },
    [
      apiStore.config.value,
      search.value,
      apiCommunes.value,
      apiStore.communes.value,
      selectedDistrict,
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
    if (selectedDistrict || selectedRegion || selectedProvince) {
      clearField();
    }
  }, [selectedDistrict]);

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

  let placeholder = "Any commune";
  if (selectedDistrict) {
    placeholder += ` in "${selectedDistrict.district}" district`;
  } else if (selectedRegion) {
    placeholder += ` in "${selectedRegion.region}" region`;
  } else if (selectedProvince) {
    placeholder += ` in "${selectedProvince.province}" province`;
  }

  const isLoadingMore =
    (shouldUseLocalApiCommunes(search.value)
      ? apiCommunesAreLoaded.value
      : apiStore.communesAreLoaded.value) && apiCommunesAreLoading.value;

  return (
    <AdmEntitiesSearchComboBoxField
      admLevelCode={AdmLevelCode.COMMUNE}
      entities={communes}
      inputValue={search.value}
      inputDirectValue={directSearch}
      legend="Search for communes"
      placeholder={placeholder}
      selectedAdmEntityValue={selectedCommuneDiscriminated}
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
