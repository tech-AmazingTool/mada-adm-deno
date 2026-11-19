import { useMemo } from "preact/hooks";
import { useComputed, useSignal } from "@preact/signals";
import { AdmEntityDiscriminated, Province } from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";
import AdmEntitiesSearchComboBoxField from "@/components/shared/AdmEntitiesSearchComboBoxField.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

export type AdmExplorerPageCascadeFilteringProvinceProps = {
  selectedProvince: Province | null;
  onSelectedChange?: (province: Province | null) => void;
};

export default function AdmExplorerPageCascadeFilteringProvince(
  { selectedProvince, onSelectedChange }:
    AdmExplorerPageCascadeFilteringProvinceProps,
) {
  const apiStore = useStoresContext().injectApiStore();

  const search = useSignal("");

  const provinces = useComputed<Province[]>(() => {
    if (!search.value) return apiStore.provinces.value;
    const searchValue = search.value.toLocaleLowerCase("fr");
    return apiStore.provinces.value.filter((province) => {
      return province.province.toLocaleLowerCase("fr").startsWith(
        searchValue,
      );
    });
  });

  const _selectedProvince = useMemo<AdmEntityDiscriminated | null>(() => {
    return selectedProvince
      ? { admLevelCode: AdmLevelCode.PROVINCE, entity: selectedProvince }
      : null;
  }, [selectedProvince]);

  function handleSelected(admEntityDiscriminated: AdmEntityDiscriminated) {
    if (admEntityDiscriminated.admLevelCode === AdmLevelCode.PROVINCE) {
      onSelectedChange?.(admEntityDiscriminated.entity);
    }
  }

  return (
    <>
      <AdmEntitiesSearchComboBoxField
        admLevelCode={AdmLevelCode.PROVINCE}
        entities={provinces.value}
        inputValue={search.value}
        legend="Search for provinces"
        placeholder="Any province"
        selectedAdmEntityValue={_selectedProvince}
        onInputChange={(value) => search.value = value}
        onSelected={handleSelected}
        onSelectedClose={() => onSelectedChange?.(null)}
      />
    </>
  );
}
