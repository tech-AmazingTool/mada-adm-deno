import { useEffect } from "preact/hooks";
import { WaypointsIcon } from "lucide-preact";
import { useWalkthroughDriverContext } from "@/contexts/walkthrough-driver/index.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function LandingPageWalkthroughBtn() {
  const { mapIsLoaded } = useStoresContext().injectAppMapStore();

  const {
    injectWalkThroughDriver,
    getHasDoneFirstWalkThrough,
    setHasDoneFirstWalkThrough,
  } = useWalkthroughDriverContext();

  useEffect(
    () => {
      if (!mapIsLoaded.value || getHasDoneFirstWalkThrough()) return;

      setHasDoneFirstWalkThrough();

      const driver = injectWalkThroughDriver();
      driver.drive(0);
    },
    [mapIsLoaded.value],
  );

  function handleClick() {
    const driver = injectWalkThroughDriver();
    driver.drive(0);
  }

  return (
    <button type="button" class="btn btn-primary mt-1" onClick={handleClick}>
      <WaypointsIcon size={16} />
      Take a Walkthrough
    </button>
  );
}
