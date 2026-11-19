import { useEffect, useMemo } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { AdmEntityDiscriminated, Province, Region } from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import AdmEntitiesSearchComboBoxField from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

export type AdmExplorerPageCascadeFilteringRegionProps = {
  selectedProvince: Province | null;
  selectedRegion: Region | null;
  onSelectedChange?: (province: Region | null) => void;
};

export default function AdmExplorerPageCascadeFilteringRegion({
  selectedProvince,
  selectedRegion,
  onSelectedChange,
}: AdmExplorerPageCascadeFilteringRegionProps) {
  const search = useSignal("");
  const directSearch = useSignal("");

  const apiStore = useStoresContext().injectApiStore();

  const regions = useMemo<Region[]>(() => {
    let apiRegions = apiStore.regions.value;
    if (selectedProvince) {
      apiRegions = apiRegions.filter(
        (region) => region.province === selectedProvince.province,
      );
    }
    if (search.value) {
      const searchValue = search.value.toLocaleLowerCase("fr");
      apiRegions = apiRegions
        .filter((region) => {
          return region.region.toLocaleLowerCase("fr").startsWith(searchValue);
        });
    } else {
      apiRegions = [...apiRegions];
    }
    return apiRegions.sort((a, b) => {
      return a.region.localeCompare(b.region, "fr");
    });
  }, [selectedProvince, search.value]);

  let placeholder = "Any region";
  if (selectedProvince) {
    placeholder += ` inside "${selectedProvince.province}" province`;
  }

  useEffect(() => {
    if (selectedProvince) {
      onSelectedChange?.(null);
      search.value = "";
      directSearch.value = "";
    }
  }, [selectedProvince]);

  const selectedRegionDiscriminated = useMemo<AdmEntityDiscriminated | null>(
    () => {
      return selectedRegion
        ? {
          admLevelCode: AdmLevelCode.REGION,
          entity: selectedRegion,
        }
        : null;
    },
    [selectedRegion],
  );

  function handleSelected(admEntityDiscriminated: AdmEntityDiscriminated) {
    if (admEntityDiscriminated.admLevelCode === AdmLevelCode.REGION) {
      onSelectedChange?.(admEntityDiscriminated.entity);
    }
  }

  return (
    <AdmEntitiesSearchComboBoxField
      admLevelCode={AdmLevelCode.REGION}
      entities={regions}
      inputValue={search.value}
      inputDirectValue={directSearch}
      legend="Search for regions"
      placeholder={placeholder}
      selectedAdmEntityValue={selectedRegionDiscriminated}
      onInputChange={(value) => search.value = value}
      onSelected={handleSelected}
      onSelectedClose={() => onSelectedChange?.(null)}
    />
  );
}
