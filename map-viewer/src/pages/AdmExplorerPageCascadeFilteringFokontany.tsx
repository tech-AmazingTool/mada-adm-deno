import { useEffect, useMemo, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  AdmEntityDiscriminated,
  Commune,
  District,
  Fokontany,
  Province,
  Region,
} from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmEntitiesSearchComboBoxField from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback.ts";
import { ApiCallPaginationParams } from "@/types/api.d.ts";
import {
  GetFokontanysPaginatedRequestParams,
  injectFokontanyApi,
} from "@/api/fokontany.api.ts";
import {
  ADM_ENTITIES_COUNT,
  ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
} from "@/config/adm-entities.config.ts";

export type AdmExplorerPageCascadeFilteringFokontanyProps = {
  selectedProvince: Province | null;
  selectedRegion: Region | null;
  selectedDistrict: District | null;
  selectedCommune: Commune | null;
  selectedFokontany: Fokontany | null;
  onSelectedChange?: (fokontany: Fokontany | null) => void;
};

export default function AdmExplorerPageCascadeFilteringFokontany({
  selectedProvince,
  selectedRegion,
  selectedDistrict,
  selectedCommune,
  selectedFokontany,
  onSelectedChange,
}: AdmExplorerPageCascadeFilteringFokontanyProps) {
  const selectedFokontanyDiscriminated = useMemo<AdmEntityDiscriminated | null>(
    () => {
      return selectedFokontany
        ? {
          admLevelCode: AdmLevelCode.FOKONTANY,
          entity: selectedFokontany,
        }
        : null;
    },
    [selectedFokontany],
  );

  function handleSelectedChange(value: AdmEntityDiscriminated) {
    if (value.admLevelCode === AdmLevelCode.FOKONTANY) {
      onSelectedChange?.(value.entity);
    }
  }

  const apiStore = useStoresContext().injectApiStore();

  const search = useSignal("");
  const directSearch = useSignal("");

  const apiFokontanys = useSignal<Fokontany[]>([]);
  const apiFokontanysNextCursor = useSignal<string | null>(null);
  const apiFokontanysAreLoading = useSignal(false);
  const apiFokontanysAreLoaded = useSignal(false);

  const fokontanyApi = injectFokontanyApi();

  const apiCallAbortControllerRef = useRef<AbortController | null>(null);

  function shouldUseLocalApiFokontanys(search?: string): boolean {
    return !!search ||
      (!search &&
        (!!selectedCommune || !!selectedDistrict || !!selectedRegion ||
          !!selectedProvince));
  }

  const fetchFokontanysDebouncedCb = useDebouncedCallback<
    [
      ApiCallPaginationParams,
      GetFokontanysPaginatedRequestParams,
      boolean,
    ]
  >(
    async (paginationParams, queryParams, isFirstLoad) => {
      try {
        const _shouldUseLocalApiFokontanys = shouldUseLocalApiFokontanys(
          queryParams.search,
        );
        if (isFirstLoad && _shouldUseLocalApiFokontanys) {
          apiFokontanysAreLoaded.value = false;
        }
        apiFokontanysAreLoading.value = true;
        apiCallAbortControllerRef.current?.abort();
        apiCallAbortControllerRef.current = new AbortController();
        const paginatedFokontanys = await fokontanyApi.getManyPaginated(
          paginationParams,
          queryParams,
          { signal: apiCallAbortControllerRef.current.signal },
        );
        if (_shouldUseLocalApiFokontanys) {
          apiFokontanys.value = isFirstLoad
            ? paginatedFokontanys.records
            : [...apiFokontanys.value, ...paginatedFokontanys.records];
          apiFokontanysNextCursor.value = paginatedFokontanys.nextEncoded ??
            null;
          apiFokontanysAreLoaded.value = true;
        } else {
          apiStore.fokontanys.value = [
            ...apiStore.fokontanys.value,
            ...paginatedFokontanys.records,
          ];
          apiStore.fokontanysNextCursor.value =
            paginatedFokontanys.nextEncoded ??
              null;
        }
      } catch (error) {
        console.error(error);
      } finally {
        apiFokontanysAreLoading.value = false;
      }
    },
    ADM_ENTITIES_SEARCH_DEBOUNCE_DELAY,
  );

  const disabledReason = useMemo<string | null>(() => {
    const config = apiStore.config.value;
    if (config && !selectedCommune) {
      if (!config.isFkRepeated) {
        if (selectedRegion) {
          return "The region id foreign key is not supported by the communes based on the database configuration.";
        }
        if (selectedDistrict) {
          return "The district id foreign key is not supported by the communes based on the database configuration.";
        }
      }
      if (
        selectedProvince && !config.isProvinceFkRepeated && !selectedRegion &&
        !selectedDistrict && !selectedCommune
      ) {
        return "The province id foreign key is not supported by the communes based on the database configuration.";
      }
    }
    return null;
  }, [
    apiStore.config.value,
    selectedProvince,
    selectedCommune,
    selectedDistrict,
    selectedRegion,
  ]);

  function buildApiCallRequestParams(
    search: string,
  ): GetFokontanysPaginatedRequestParams {
    const reqParams: GetFokontanysPaginatedRequestParams = {
      search: search,
    };
    if (selectedCommune?.id) {
      reqParams.communeId = selectedCommune.id;
    } else if (selectedDistrict?.id) {
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
      if (disabledReason || !shouldUseLocalApiFokontanys(search.value)) return;
      fetchFokontanysDebouncedCb(
        { limit: ADM_ENTITIES_COUNT.CASCADE_MODE },
        buildApiCallRequestParams(search.value),
        true,
      );
    },
    [
      disabledReason,
      search.value,
      selectedCommune,
      selectedDistrict,
      selectedRegion,
      selectedProvince,
    ],
  );

  async function handleScrollEnd() {
    if (disabledReason) return;
    const _shouldUseLocalApiFokontanys = shouldUseLocalApiFokontanys(
      search.value,
    );
    if (_shouldUseLocalApiFokontanys) {
      if (apiFokontanysAreLoaded.value && !apiFokontanysNextCursor.value) {
        return;
      }
    } else if (
      apiStore.fokontanysAreLoaded.value && !apiStore.fokontanysNextCursor.value
    ) return;
    const paginationParams: ApiCallPaginationParams = {
      limit: ADM_ENTITIES_COUNT.CASCADE_MODE,
    };
    const nextCursor = _shouldUseLocalApiFokontanys
      ? apiFokontanysNextCursor.value
      : apiStore.fokontanysNextCursor.value;
    if (nextCursor) {
      paginationParams.cursor = nextCursor;
    }
    await fetchFokontanysDebouncedCb(
      paginationParams,
      buildApiCallRequestParams(search.value),
      false,
    );
  }

  useEffect(() => {
    return () => {
      apiCallAbortControllerRef.current?.abort();
      fetchFokontanysDebouncedCb.cancel();
    };
  }, []);

  const fokontanys = useMemo(
    () => {
      if (shouldUseLocalApiFokontanys(search.value)) {
        return apiFokontanys.value;
      }
      const config = apiStore.config.value;
      if (selectedCommune) {
        return apiStore.fokontanys.value.filter((f) => {
          return f.communeId === selectedCommune.id;
        });
      }
      if (config?.isFkRepeated) {
        if (selectedDistrict) {
          return apiStore.fokontanys.value.filter((f) => {
            return f.districtId === selectedDistrict.id;
          });
        }
        if (selectedRegion) {
          return apiStore.fokontanys.value.filter((f) => {
            return f.regionId! === selectedRegion.id;
          });
        }
      }
      if (selectedProvince && config?.isProvinceFkRepeated) {
        return apiStore.fokontanys.value.filter((f) => {
          return f.provinceId! === selectedProvince.id;
        });
      }
      return apiStore.fokontanys.value;
    },
    [
      apiStore.config.value,
      search.value,
      apiFokontanys.value,
      apiStore.fokontanys.value,
      selectedCommune,
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
    if (
      selectedCommune || selectedDistrict || selectedRegion || selectedProvince
    ) {
      clearField();
    }
  }, [selectedCommune]);

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

  let placeholder = "Any fokontany";
  if (selectedCommune) {
    placeholder += ` in "${selectedCommune.commune}" commune`;
  } else if (selectedDistrict) {
    placeholder += ` in "${selectedDistrict.district}" district`;
  } else if (selectedRegion) {
    placeholder += ` in "${selectedRegion.region}" region`;
  } else if (selectedProvince) {
    placeholder += ` in "${selectedProvince.province}" province`;
  }

  const isLoadingMore =
    (shouldUseLocalApiFokontanys(search.value)
      ? apiFokontanysAreLoaded.value
      : apiStore.fokontanysAreLoaded.value) && apiFokontanysAreLoading.value;

  return (
    <AdmEntitiesSearchComboBoxField
      admLevelCode={AdmLevelCode.FOKONTANY}
      entities={fokontanys}
      inputValue={search.value}
      inputDirectValue={directSearch}
      legend="Search for fokontanys"
      placeholder={placeholder}
      selectedAdmEntityValue={selectedFokontanyDiscriminated}
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
