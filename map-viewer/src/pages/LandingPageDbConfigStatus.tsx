import { AlertTriangleIcon } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function LandingPageDbConfigStatus() {
  const { configIsLoaded, config } = useStoresContext().injectApiStore();

  return configIsLoaded.value && !config.value && (
    <div role="alert" class="alert alert-error alert-outline mt-3">
      <AlertTriangleIcon size={16} />
      <span>Database configuration not available.</span>
    </div>
  );
}
