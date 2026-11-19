import { Settings } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { computed, useSignal } from "@preact/signals";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_TITLE_BY_CODE,
} from "@scope/consts/models";
import {
  isSnakeCase,
  prefixWithCamelCase,
  prefixWithSnakeCase,
} from "@scope/utils/string";
import { injectMadaAdmConfigApi } from "@/api/mada-adm-config.api.ts";
import dbErrorIconURL from "@/assets/error.png";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function ViewConfigModal() {
  const apiStore = useStoresContext().injectApiStore();
  const config = apiStore.config;
  const configIsLoaded = apiStore.configIsLoaded;

  const configLoadingError = useSignal<string | null>(null);

  async function getInitialConfig() {
    try {
      config.value = await injectMadaAdmConfigApi().get();
      configIsLoaded.value = true;
    } catch (error) {
      configLoadingError.value = (error as Error).message;
    }
  }

  useEffect(() => {
    getInitialConfig();
  }, []);

  const label = "Database configuration";

  const prefixCase = computed<"snake" | "camel" | null>(() => {
    if (!config.value?.tablesPrefix) return null;
    return isSnakeCase(config.value.tablesPrefix) ? "snake" : "camel";
  });

  const actualTableNames = computed(() => {
    return ADM_LEVEL_CODES_INDEXED
      .map((code) => `${ADM_LEVEL_TITLE_BY_CODE.get(code)!}s`)
      .map((title) => {
        if (!prefixCase.value || !config.value?.tablesPrefix) return title;
        return prefixCase.value === "snake"
          ? prefixWithSnakeCase(config.value.tablesPrefix, title)
          : prefixWithCamelCase(config.value.tablesPrefix, title);
      });
  });

  return (
    <>
      <div class="flex justify-center">
        <div className="tooltip tooltip-right" data-tip={label}>
          <button
            type="button"
            id="sidebar-database-config-btn"
            command="show-modal"
            commandfor="config-modal"
            class="btn btn-circle btn-lg text-base-content/90 hover:text-base-content duration-300"
            aria-label={label}
          >
            <Settings />
          </button>
        </div>
        <dialog id="config-modal" class="modal">
          <div class="modal-box w-11/12 max-w-5xl">
            <h2 class="text-lg font-bold flex items-center gap-x-3 mb-4">
              <Settings />
              <span>Current database configuration</span>
            </h2>
            <div class="overflow-x-auto">
              {config && (
                <table class="table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th class="text-center">Data type</th>
                      <th class="text-center">Value</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>tablesPrefix</strong>
                      </td>
                      <td class="text-center">
                        <p class="flex items-center gap-x-1">
                          <span class="badge badge-soft badge-info">
                            string
                          </span>
                          |
                          <span class="badge badge-soft badge-info">null</span>
                        </p>
                      </td>
                      <td class="text-center">
                        {config.value?.tablesPrefix
                          ? (
                            <span class="badge badge-soft badge-success">
                              "{config.value.tablesPrefix}"
                            </span>
                          )
                          : (
                            <span class="badge badge-soft badge-error">
                              null
                            </span>
                          )}
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          <strong>Prefixes</strong>{" "}
                          the ADM tables' names with the given{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            string
                          </span>{" "}
                          <strong>prefix value</strong> if it is{" "}
                          <strong>not null</strong>. Otherwise, if{" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            null
                          </span>, the ADM tables' retain their{" "}
                          <strong>original names</strong>. The current ADM
                          tables are: {actualTableNames.value.map((t) => (
                            <>
                              <strong key={t}>{t}</strong>,{" "}
                            </>
                          ))}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>isFkRepeated</strong>
                      </td>
                      <td class="text-center">
                        <span class="badge badge-soft badge-info">
                          boolean
                        </span>
                      </td>
                      <td class="text-center">
                        <span
                          class={`badge badge-soft ${
                            config.value?.isFkRepeated
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {config.value?.isFkRepeated ? "true" : "false"}
                        </span>
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          If{" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            false
                          </span>, all the ADM tables include{" "}
                          <strong>only</strong> the <strong>foreign key</strong>
                          {" "}
                          of the{" "}
                          <strong>direct parent ADM table</strong>. Otherwise,
                          if{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            true
                          </span>, the ADM tables include the{" "}
                          <strong>foreign keys</strong> of{" "}
                          <strong>all the parent ADM tables</strong>{" "}
                          above them up to the <strong>regions</strong> table.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>isProvinceRepeated</strong>
                      </td>
                      <td class="text-center">
                        <span class="badge badge-soft badge-info">
                          boolean
                        </span>
                      </td>
                      <td class="text-center">
                        <span
                          class={`badge badge-soft ${
                            config.value?.isProvinceRepeated
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {config.value?.isProvinceRepeated ? "true" : "false"}
                        </span>
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          If{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            true
                          </span>, <strong>all the ADM tables</strong>{" "}
                          include the <strong>province</strong>{" "}
                          name. Otherwise, if{" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            false
                          </span>, only the <strong>provinces</strong>{" "}
                          table include the <strong>province</strong> name.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>isProvinceFkRepeated</strong>
                      </td>
                      <td class="text-center">
                        <span class="badge badge-soft badge-info">
                          boolean
                        </span>
                      </td>
                      <td class="text-center">
                        <span
                          class={`badge badge-soft ${
                            config.value?.isProvinceFkRepeated
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {config.value?.isProvinceFkRepeated
                            ? "true"
                            : "false"}
                        </span>
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          If{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            true
                          </span>,{" "}
                          <strong>
                            all the ADM tables below the provinces
                          </strong>{" "}
                          table include{" "}
                          <strong>province id foreign keys</strong>. Otherwise,
                          if{" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            false
                          </span>, <strong>only the regions table</strong>{" "}
                          includes the <strong>province id foreign key</strong>.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>hasGeojson</strong>
                      </td>
                      <td class="text-center">
                        <span class="badge badge-soft badge-info">
                          boolean
                        </span>
                      </td>
                      <td class="text-center">
                        {config.value?.hasGeojson
                          ? (
                            <span class="badge badge-soft badge-success">
                              true
                            </span>
                          )
                          : (
                            <span class="badge badge-soft badge-error">
                              false
                            </span>
                          )}
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          If{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            true
                          </span>, the ADM tables include{" "}
                          <strong>GeoJSON geometries</strong>. Otherwise, if
                          {" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            false
                          </span>, the ADM tables <strong>do not</strong>. The
                          {" "}
                          <strong>GeoJSON geometries</strong> are stored in the
                          {" "}
                          <strong>geojson</strong> column.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>hasAdmLevel</strong>
                      </td>
                      <td class="text-center">
                        <span class="badge badge-soft badge-info">
                          boolean
                        </span>
                      </td>
                      <td class="text-center">
                        {config.value?.hasAdmLevel
                          ? (
                            <span class="badge badge-soft badge-success">
                              true
                            </span>
                          )
                          : (
                            <span class="badge badge-soft badge-error">
                              false
                            </span>
                          )}
                      </td>
                      <td>
                        <p class="text-sm text-base-content/90">
                          If{" "}
                          <span class="badge-sm badge badge-success badge-soft">
                            true
                          </span>, the ADM tables include the{" "}
                          <strong>admLevel</strong> column. Otherwise, if{" "}
                          <span class="badge-sm badge badge-error badge-soft">
                            false
                          </span>, the ADM tables <strong>do not</strong>. The
                          {" "}
                          <strong>admLevel</strong>{" "}
                          column holds an integer value within the range of{" "}
                          <strong>0 to 4</strong> that maps to the{" "}
                          <strong>ADM levels hierarchy</strong>{" "}
                          starting from the province level to the fokontany
                          level.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
              {!config && !!configLoadingError && (
                <div class="py-16 flex flex-col items-center">
                  <img
                    src={dbErrorIconURL}
                    alt="Missing database config"
                    loading="lazy"
                    decoding="async"
                    width="512"
                    height="512"
                    class="w-21"
                  />
                  <p class="mt-4 text-error">
                    Failed to load the database configuration.
                  </p>
                  <p class="text-error text-sm text-center mt-2 max-w-2xl">
                    {configLoadingError}
                  </p>
                </div>
              )}
            </div>
            <div class="modal-action">
              <form method="dialog">
                <button type="submit" value="close-btn" class="btn btn-outline">
                  Close
                </button>
              </form>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="submit" value="close-backdrop">close</button>
          </form>
        </dialog>
      </div>
    </>
  );
}
