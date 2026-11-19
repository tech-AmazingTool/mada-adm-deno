import { useSignal } from "@preact/signals";
import {
  Commune,
  District,
  Fokontany,
  Province,
  Region,
} from "@scope/types/models";
import AdmExplorerPageCascadeFilteringProvince from "@/pages/AdmExplorerPageCascadeFilteringProvince.tsx";
import AdmExplorerPageCascadeFilteringRegion from "@/pages/AdmExplorerPageCascadeFilteringRegion.tsx";
import AdmExplorerPageCascadeFilteringDistrict from "@/pages/AdmExplorerPageCascadeFilteringDistrict.tsx";
import AdmExplorerPageCascadeFilteringCommune from "@/pages/AdmExplorerPageCascadeFilteringCommune.tsx";
import AdmExplorerPageCascadeFilteringFokontany from "@/pages/AdmExplorerPageCascadeFilteringFokontany.tsx";

export default function AdmExplorerPageCascadeFiltering() {
  const selectedProvince = useSignal<Province | null>(null);
  const selectedRegion = useSignal<Region | null>(null);
  const selectedDistrict = useSignal<District | null>(null);
  const selectedCommune = useSignal<Commune | null>(null);
  const selectedFokontany = useSignal<Fokontany | null>(null);

  return (
    <form class="space-y-3 pb-64">
      <AdmExplorerPageCascadeFilteringProvince
        selectedProvince={selectedProvince.value}
        onSelectedChange={(province) => selectedProvince.value = province}
      />
      <AdmExplorerPageCascadeFilteringRegion
        selectedProvince={selectedProvince.value}
        selectedRegion={selectedRegion.value}
        onSelectedChange={(region) => selectedRegion.value = region}
      />
      <AdmExplorerPageCascadeFilteringDistrict
        selectedProvince={selectedProvince.value}
        selectedRegion={selectedRegion.value}
        selectedDistrict={selectedDistrict.value}
        onSelectedChange={(district) => selectedDistrict.value = district}
      />
      <AdmExplorerPageCascadeFilteringCommune
        selectedProvince={selectedProvince.value}
        selectedRegion={selectedRegion.value}
        selectedDistrict={selectedDistrict.value}
        selectedCommune={selectedCommune.value}
        onSelectedChange={(commune) => selectedCommune.value = commune}
      />
      <AdmExplorerPageCascadeFilteringFokontany
        selectedProvince={selectedProvince.value}
        selectedRegion={selectedRegion.value}
        selectedDistrict={selectedDistrict.value}
        selectedCommune={selectedCommune.value}
        selectedFokontany={selectedFokontany.value}
        onSelectedChange={(fokontany) => selectedFokontany.value = fokontany}
      />
    </form>
  );
}
