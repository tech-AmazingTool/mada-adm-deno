import { useContext } from "preact/hooks";
import { storesContext, type StoresContextValue } from "./stores.context.ts";

export function useStoresContext(): StoresContextValue {
  return useContext(storesContext);
}
