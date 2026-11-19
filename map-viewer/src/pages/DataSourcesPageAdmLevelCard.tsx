import { ComponentChildren } from "preact";
import { Layers2 } from "lucide-preact";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { ADM_GEOJSON_DATA_SOURCE_BY_CODE } from "@/consts/adm-geojson.consts.ts";
import AdmLevelDataSourceCardCacheStatus from "@/pages/DataSourcesPageAdmLevelCardCacheStatus.tsx";

export type DataSourcesPageAdmLevelCardProps = {
  admLevelCode: AdmLevelCode;
  body: ComponentChildren;
};

export default function DataSourcesPageAdmLevelCard(
  { admLevelCode, body }: DataSourcesPageAdmLevelCardProps,
) {
  const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;

  const layerPreviewURL =
    ADM_GEOJSON_DATA_SOURCE_BY_CODE.get(admLevelCode)!.previewURL;

  return (
    <article class="text-sm px-3 py-4 shadow-sm hover:shadow-lg duration-300 shadow-gray-900/40 hover:shadow-gray-900/30 rounded">
      <h3 class="font-bold mb-2">
        <a
          href={layerPreviewURL}
          target="_blank"
          class="hover:underline hover:text-primary duration-300 flex items-center gap-x-2"
        >
          <Layers2 size={16} strokeWidth={2.5} />
          <span>
            {admLevelCode}: <span class="capitalize">{admLevelTitle}</span>s
          </span>
        </a>
      </h3>
      <p class="text-base-content/90">{body}</p>
      <AdmLevelDataSourceCardCacheStatus
        admLevelCode={admLevelCode}
      />
    </article>
  );
}
