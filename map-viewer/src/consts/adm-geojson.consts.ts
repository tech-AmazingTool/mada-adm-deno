import { AdmLevelCode } from "@scope/consts/models";

export type AdmGeojsonDataSource = {
  rawURL: string;
  previewURL: string;
  isNDJSON: boolean;
  fileSize: number;
};

export const ADM_GEOJSON_DATA_SOURCE_BY_CODE: Map<
  AdmLevelCode,
  AdmGeojsonDataSource
> = new Map<AdmLevelCode, AdmGeojsonDataSource>([
  [
    AdmLevelCode.PROVINCE,
    {
      rawURL:
        "https://github.com/AmazingTool777-911/madagascar-administrative-boundaries/raw/refs/heads/main/data/ndjson/provinces.ndjson",
      previewURL:
        "https://github.com/AmazingTool777-911/madagascar-administrative-boundaries/blob/main/data/ndjson/provinces.ndjson",
      isNDJSON: true,
      fileSize: 2_243_308,
    },
  ],
  [
    AdmLevelCode.REGION,
    {
      rawURL:
        "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM1/geoBoundaries-MDG-ADM1.geojson",
      previewURL:
        "https://github.com/wmgeolab/geoBoundaries/blob/main/releaseData/gbOpen/MDG/ADM1/geoBoundaries-MDG-ADM1.geojson",
      isNDJSON: false,
      fileSize: 2_873_535,
    },
  ],
  [
    AdmLevelCode.DISTRICT,
    {
      rawURL:
        "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM2/geoBoundaries-MDG-ADM2.geojson",
      previewURL:
        "https://github.com/wmgeolab/geoBoundaries/blob/main/releaseData/gbOpen/MDG/ADM2/geoBoundaries-MDG-ADM2.geojson",
      isNDJSON: false,
      fileSize: 28_762_983,
    },
  ],
  [
    AdmLevelCode.COMMUNE,
    {
      rawURL:
        "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM3/geoBoundaries-MDG-ADM3.geojson",
      previewURL:
        "https://github.com/wmgeolab/geoBoundaries/blob/main/releaseData/gbOpen/MDG/ADM3/geoBoundaries-MDG-ADM3.geojson",
      isNDJSON: false,
      fileSize: 65_347_842,
    },
  ],
  [
    AdmLevelCode.FOKONTANY,
    {
      rawURL:
        "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MDG/ADM4/geoBoundaries-MDG-ADM4.geojson",
      previewURL:
        "https://github.com/wmgeolab/geoBoundaries/blob/main/releaseData/gbOpen/MDG/ADM4/geoBoundaries-MDG-ADM4.geojson",
      isNDJSON: false,
      fileSize: 79_669_216,
    },
  ],
]);
