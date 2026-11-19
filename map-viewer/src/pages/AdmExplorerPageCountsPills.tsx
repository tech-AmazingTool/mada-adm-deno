import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
} from "@scope/consts/models";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmPill from "@/components/shared/AdmPill.tsx";

export default function AdmExplorerPageCountsPills() {
  const appMapStore = useStoresContext().injectAppMapStore();

  async function handleClick(admLevelCode: AdmLevelCode) {
    await appMapStore.enableAdmGeoJsonLayer(admLevelCode, { fitBbox: true });
  }

  return (
    <ul
      id="adm-explorer-page-territory-distribution-summary"
      class="m-0 p-0 list-none flex gap-2 flex-wrap"
    >
      {ADM_LEVEL_CODES_INDEXED.map((admLevelCode) => {
        const pluralTitle = `${ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!}s`;
        const count = ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(admLevelCode)!
          .toLocaleString("en-US");
        return (
          <li key={admLevelCode}>
            <AdmPill
              admLevelCode={admLevelCode}
              text={pluralTitle}
              title={`${count} ${pluralTitle}`}
              badge={count}
              onClick={handleClick}
            />
          </li>
        );
      })}
    </ul>
  );
}
