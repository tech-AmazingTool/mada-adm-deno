import { createContext } from "preact";
import { Driver, driver } from "driver.js";

export type WalkThroughDriverContextValue = {
  injectWalkThroughDriver: () => Driver;
  getLastWalkThroughStep: () => number | null;
  setLastWalkThroughStep: (step: number) => void;
  getHasDoneFirstWalkThrough: () => boolean;
  setHasDoneFirstWalkThrough: () => void;
};

export const walkThroughDriverContext = createContext<
  WalkThroughDriverContextValue
>({
  injectWalkThroughDriver: () => driver({}),
  getLastWalkThroughStep: () => null,
  setLastWalkThroughStep: () => {},
  getHasDoneFirstWalkThrough: () => false,
  setHasDoneFirstWalkThrough: () => {},
});
