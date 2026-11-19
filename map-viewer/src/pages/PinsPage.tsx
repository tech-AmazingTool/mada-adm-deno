import PinsPageCtaBtn from "@/pages/PinsPageCtaBtn.tsx";
import PinsPagePinLocationModal from "@/pages/PinsPagePinLocationModal.tsx";
import PinsPageSavedLocations from "@/pages/PinsPageSavedLocations.tsx";
import WalkthroughResumer from "@/components/shared/WalkthroughResumer.tsx";
import { useHead } from "@/hooks/useHead.ts";

export default function PinsPage() {
  useHead({
    title: "Pinned locations | Map Viewer - Mada ADM",
    description:
      "Pin custom locations to the map; then, view and organize them in one place.",
  });

  return (
    <div>
      <main>
        <header>
          <h1 class="font-bold text-lg mb-2">Pinned locations</h1>
          <p class="text-sm text-base-content/90">
            Save, organize, and monitor <strong>custom locations</strong>{" "}
            directly on the map. You can capture your{" "}
            <strong>live current location</strong> , drop{" "}
            <strong>map markers</strong> anywhere, or manually enter{" "}
            <strong>arbitrary geographic coordinates</strong>{" "}
            to dynamically resolve and explore their{" "}
            <strong>full administrative hierarchy</strong>{" "}
            from province down to fokontany.
          </p>
          <div class="mt-5">
            <PinsPageCtaBtn />
          </div>
        </header>
        <div class="mt-6">
          <PinsPageSavedLocations />
        </div>
        <aside>
          <PinsPagePinLocationModal />
        </aside>
      </main>
      <WalkthroughResumer resumeSteps={[6, 7, 8]} />
    </div>
  );
}
