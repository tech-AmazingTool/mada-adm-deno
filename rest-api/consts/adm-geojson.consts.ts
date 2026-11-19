import { AdmLevelCode } from "@scope/consts/models";

export const ADM_GEOJSON_RAW_FILE_URL_BY_CODE: Map<AdmLevelCode, string> =
  new Map([
    [
      AdmLevelCode.PROVINCE,
      "https://github.com/tech-AmazingTool/mada-adm-deno/raw/refs/heads/main/data/ndjson/provinces.ndjson",
    ],
    [
      AdmLevelCode.REGION,
      "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM1/geoBoundaries-MDG-ADM1.geojson",
    ],
    [
      AdmLevelCode.DISTRICT,
      "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM2/geoBoundaries-MDG-ADM2.geojson",
    ],
    [
      AdmLevelCode.COMMUNE,
      "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM3/geoBoundaries-MDG-ADM3.geojson",
    ],
    [
      AdmLevelCode.FOKONTANY,
      "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM4/geoBoundaries-MDG-ADM4.geojson",
    ],
  ]);
