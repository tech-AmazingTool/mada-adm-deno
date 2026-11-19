import { useSignal, useSignalEffect } from "@preact/signals";
import { ArrowDownFromLine, ArrowDownWideNarrow } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";
import AdmExplorerPageMissingConfigError from "@/pages/AdmExplorerPageMissingConfigError.tsx";
import AdmExplorerPageCascadeFiltering from "@/pages/AdmExplorerPageCascadeFiltering.tsx";
import AdmExplorerPageGlobalFiltering from "@/pages/AdmExplorerPageGlobalFiltering.tsx";

export default function AdmExplorerPageSearchModeTabs() {
  const apiStore = useStoresContext().injectApiStore();

  const hasMissingConfigError = useSignal(false);

  useSignalEffect(() => {
    if (apiStore.configIsLoaded.value && !apiStore.config.value) {
      hasMissingConfigError.value = true;
    }
  });

  const activeTab = useSignal<"global" | "cascade">("global");

  const activeClassName = "text-primary [--tab-border-color:primary]";

  return (
    <div id="adm-explorer-page-search-mode-section">
      {!hasMissingConfigError.value
        ? (
          <>
            <div
              role="tablist"
              class="tabs tabs-border border-b border-b-solid border-b-base-content/30 sticky top-0 pt-1 bg-white z-20"
            >
              <label
                class={`tab ${
                  activeTab.value === "global" ? activeClassName : ""
                }`}
              >
                <input
                  type="radio"
                  name="search-mode"
                  checked={activeTab.value === "global"}
                  onChange={() => activeTab.value = "global"}
                />
                <ArrowDownFromLine size={16} class="mr-2" />
                Global mode
              </label>
              <label
                class={`tab ${
                  activeTab.value === "cascade" ? activeClassName : ""
                }`}
              >
                <input
                  type="radio"
                  name="search-mode"
                  checked={activeTab.value === "cascade"}
                  onChange={() => activeTab.value = "cascade"}
                />
                <ArrowDownWideNarrow
                  size={16}
                  class="mr-2"
                />
                Cascade mode
              </label>
            </div>
            <div class="pt-5 h-dvh">
              {activeTab.value === "global"
                ? <AdmExplorerPageGlobalFiltering />
                : <AdmExplorerPageCascadeFiltering />}
            </div>
          </>
        )
        : <AdmExplorerPageMissingConfigError />}
    </div>
  );
}
