import { useContext } from "preact/hooks";
import {
  walkThroughDriverContext,
  WalkThroughDriverContextValue,
} from "./walkthrough-driver.context.ts";

export function useWalkthroughDriverContext(): WalkThroughDriverContextValue {
  return useContext(walkThroughDriverContext);
}
