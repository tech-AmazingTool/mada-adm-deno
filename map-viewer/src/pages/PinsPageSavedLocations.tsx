import PinsPageCurrentLocationCard from "@/pages/PinsPageCurrentLocationCard.tsx";
import PinsPagePinnedLocationCard from "@/pages/PinsPagePinnedLocationCard.tsx";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function PinsPageSavedLocations() {
  const pinnedLocationsStore = useStoresContext().injectPinnedLocationsStore();
  const { currentLocationEntry, pinnedLocations } = pinnedLocationsStore;

  const hasSavedLocations = !!currentLocationEntry.value ||
    pinnedLocations.value.length > 0;

  return (
    <section
      id="pins-page-saved-locations"
      aria-labelledby="pins-page-saved-locations-title"
    >
      <h2 id="pins-page-saved-locations-title" class="font-bold">
        Saved locations
      </h2>
      {!hasSavedLocations
        ? (
          <p class="text-sm text-base-content/70 mt-1.5">
            No saved locations yet.
          </p>
        )
        : (
          <div class="mt-3">
            {currentLocationEntry.value && <PinsPageCurrentLocationCard />}
            {currentLocationEntry.value && pinnedLocations.value.length > 0 && (
              <hr class="text-base-content/15 my-6" />
            )}
            {pinnedLocations.value.length > 0 && (
              <div class="space-y-6 pb-6">
                {pinnedLocations.value.map((pinnedLocation, i) => (
                  <PinsPagePinnedLocationCard
                    key={pinnedLocation.id}
                    pinnedLocationEntry={pinnedLocation}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        )}
    </section>
  );
}
