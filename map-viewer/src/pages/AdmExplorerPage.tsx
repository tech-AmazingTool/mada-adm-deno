import AdmExplorerPageCountsPills from "@/pages/AdmExplorerPageCountsPills.tsx";
import AdmExplorerPageSearchModeTabs from "@/pages/AdmExplorerPageSearchModeTabs.tsx";
import WalkthroughResumer from "@/components/shared/WalkthroughResumer.tsx";
import { useHead } from "@/hooks/useHead.ts";

export default function AdmExplorerPage() {
  useHead({
    title: "Administrative boundaries explorer | Map Viewer - Mada ADM",
    description:
      "Explore the administrative boundaries data of Madagascar through flexible search modes.",
  });

  return (
    <main class="space-y-8">
      <header>
        <h1 class="font-bold text-lg mb-2">Administrative explorer</h1>
        <p class="text-sm text-base-content/90">
          Discover and query the hierarchical administrative boundaries of
          Madagascar, from major <strong>provinces</strong> down to localized
          {" "}
          <strong>fokontanys</strong>. Use the tools below to check{" "}
          <a
            href="#territory-distribution-summary-title"
            class="link link-primary"
          >
            total counts
          </a>{" "}
          or look up specific territories using our{" "}
          <a href="#select-search-mode-title" class="link link-primary">
            flexible search modes
          </a>.
        </p>
      </header>
      <section
        aria-labelledby="territory-distribution-summary-title"
        aria-describedby="territory-distribution-summary-description"
        data-theme="adm"
      >
        <h3 id="territory-distribution-summary-title" class="font-bold mb-2">
          Territory Distribution Summary
        </h3>
        <p id="territory-distribution-summary-description" class="text-sm mb-3">
          A high-level overview of the total recorded administrative divisions
          currently mapped across Madagascar.
        </p>
        <div>
          <AdmExplorerPageCountsPills />
        </div>
      </section>
      <section
        aria-labelledby="select-search-mode-title"
        aria-describedby="select-search-mode-description"
      >
        <h2 id="select-search-mode-title" class="font-bold mb-2">
          Select your search mode
        </h2>
        <p
          id="select-search-mode-description"
          class="text-base-content/90 text-sm mb-2"
        >
          Choose how you want to explore the data hierarchy.
        </p>
        <ul class="text-sm pl-4 list-disc space-y-1 mb-2">
          <li>
            <strong>Global Level Filtering</strong>: Pick a starting
            administrative tier and search for any territory at or beneath that
            level.
          </li>
          <li>
            <strong>Hierarchical Cascade</strong>: Drill down sequentially from
            Province to Fokontany to explore precise nested relationships.
          </li>
        </ul>
        <AdmExplorerPageSearchModeTabs />
      </section>
      <WalkthroughResumer resumeSteps={[3, 4, 5]} />
    </main>
  );
}
