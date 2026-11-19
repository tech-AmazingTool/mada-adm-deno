import { WaypointsIcon } from "lucide-preact";
import { useWalkthroughDriverContext } from "@/contexts/walkthrough-driver/index.ts";

export default function SidebarWalkthroughBtn() {
  const {
    injectWalkThroughDriver,
    getHasDoneFirstWalkThrough,
    setHasDoneFirstWalkThrough,
    setLastWalkThroughStep,
  } = useWalkthroughDriverContext();

  function onClick() {
    const driver = injectWalkThroughDriver();
    if (!getHasDoneFirstWalkThrough()) {
      setHasDoneFirstWalkThrough();
    }
    driver.drive(0);
    setLastWalkThroughStep(0);
  }

  const label = "Take a Walkthrough";

  return (
    <div class="tooltip tooltip-right" data-tip={label}>
      <button
        type="button"
        id="sidebar-walkthrough-btn"
        aria-label={label}
        class="btn btn-circle btn-lg text-base-content/90 hover:text-base-content duration-300"
        onClick={onClick}
      >
        <WaypointsIcon />
      </button>
    </div>
  );
}
