import { AdmLevelCode } from "@scope/consts/models";

export type AdmGeoJsonLayerCheckedState = {
  code: AdmLevelCode;
  checked: boolean | "loading";
  isFirstTime: boolean;
};
