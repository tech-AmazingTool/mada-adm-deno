import { ExternalLinkIcon } from "lucide-preact";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import DataSourcesPageAdmLevelCard from "@/pages/DataSourcesPageAdmLevelCard.tsx";
import DataSourcesPageCacheStatus from "@/pages/DataSourcesPageCacheStatus.tsx";
import { ADM_GEOJSON_DATA_SOURCE_BY_CODE } from "@/consts/adm-geojson.consts.ts";
import { useHead } from "@/hooks/useHead.ts";

export default function DataSourcesPage() {
  useHead({
    title: "Data sources | Map Viewer - Mada ADM",
    description:
      "View the data sources of the app's database and enable them as layers.",
  });

  return (
    <div>
      <main>
        <header class="mb-5">
          <h1 class="font-bold text-lg mb-2">Data sources</h1>
          <p class="text-sm text-base-content/90">
            The map features displayed here are managed by the{" "}
            <a
              href="https://github.com/AmazingTool777-911/madagascar-administrative-boundaries"
              target="_blank"
              class="link link-primary"
            >
              Mada ADM app{" "}
              <ExternalLinkIcon
                size={14}
                class="inline-block relative bottom-0.5"
              />
            </a>. The primary spatial data is sourced from the{" "}
            <a
              href="https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar"
              target="_blank"
              class="link link-primary"
            >
              geoBoundaries Open License Dataset for Madagascar via HDX{" "}
              <ExternalLinkIcon
                size={14}
                class="inline-block relative bottom-0.5"
              />
            </a>, referencing the specific files maintained in the{" "}
            <a
              href="https://github.com/wmgeolab/geoBoundaries/tree/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/MDG"
              target="_blank"
              class="link link-primary"
            >
              geoBoundaries GitHub Repository{" "}
              <ExternalLinkIcon
                size={14}
                class="inline-block relative bottom-0.5"
              />
            </a>.
          </p>
        </header>
        <section
          aria-labelledby="layers-title"
          aria-describedby="layers-description"
          class="pb-4 space-y-6"
        >
          <header>
            <h2 id="layers-title" class="font-bold text-base mb-2">
              Layers
            </h2>
            <p
              id="layers-description"
              class="text-sm mb-1 text-base-content/90"
            >
              <strong>Layers</strong> are the source{" "}
              <strong>GeoJSON files</strong>{" "}
              that power the app's administrative boundaries database, and they
              can also be toggled onto the map. These layers are organized into
              {" "}
              <strong>5 distinct tiers</strong>{" "}
              that follows the complete hierarchy of{" "}
              <a
                href="https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country"
                target="_blank"
                class="link link-primary"
              >
                Madagascar's administrative divisions{" "}
                <ExternalLinkIcon
                  size={14}
                  class="inline-block relative bottom-0.5"
                />
              </a>:
            </p>
            <ol
              start={0}
              class="m-0 p-0 pl-4 list-decimal list-inside text-sm mb-4"
            >
              {ADM_GEOJSON_DATA_SOURCE_BY_CODE.entries().toArray().map((
                [admLevelCode, { previewURL }],
              ) => (
                <li key={admLevelCode}>
                  <a
                    href={previewURL}
                    target="_blank"
                    class="link link-primary capitalize"
                  >
                    {ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!}s
                  </a>
                </li>
              ))}
            </ol>
          </header>
          <DataSourcesPageCacheStatus />
          <div id="data-sources-adm-layers" class="space-y-6">
            {[
              {
                admLevelCode: AdmLevelCode.PROVINCE,
                body: (
                  <>
                    Represents the official{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Provinces_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      provinces boundaries of Madagascar{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>. Since the province tier is not present in the original
                    {" "}
                    <a
                      href="https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      geoBoundaries{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    dataset, its layer consists of custom generated data by the
                    {" "}
                    <a
                      href="https://github.com/AmazingTool777-911/madagascar-administrative-boundaries"
                      target="_blank"
                      class="link link-primary"
                    >
                      Mada ADM app{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    resulting from the grouping of the spatial features of their
                    respective underlying regions.
                  </>
                ),
              },
              {
                admLevelCode: AdmLevelCode.REGION,
                body: (
                  <>
                    Represents the official{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Regions_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      regional boundaries of Madagascar{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    as provided by the original{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Regions_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      geoBoundaries{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    repository.
                  </>
                ),
              },
              {
                admLevelCode: AdmLevelCode.DISTRICT,
                body: (
                  <>
                    Represents the official{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Districts_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      district boundaries of Madagascar{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    as provided by the original{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Regions_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      geoBoundaries{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    repository.
                  </>
                ),
              },
              {
                admLevelCode: AdmLevelCode.COMMUNE,
                body: (
                  <>
                    Represents the official{" "}
                    <a
                      href="https://fr.wikipedia.org/wiki/Commune_(Madagascar)"
                      target="_blank"
                      class="link link-primary"
                    >
                      commune boundaries of Madagascar{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    as provided by the original{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Regions_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      geoBoundaries{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    repository.
                  </>
                ),
              },
              {
                admLevelCode: AdmLevelCode.FOKONTANY,
                body: (
                  <>
                    Represents the official{"  "}
                    <a
                      href="https://fr.wikipedia.org/wiki/Fokontany"
                      target="_blank"
                      class="link link-primary"
                    >
                      fokontany boundaries of Madagascar{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    as provided by the original{" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Regions_of_Madagascar"
                      target="_blank"
                      class="link link-primary"
                    >
                      geoBoundaries{" "}
                      <ExternalLinkIcon
                        size={14}
                        class="inline-block relative bottom-0.5"
                      />
                    </a>{" "}
                    repository.
                  </>
                ),
              },
            ].map(({ admLevelCode, body }) => (
              <DataSourcesPageAdmLevelCard
                admLevelCode={admLevelCode}
                body={body}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
