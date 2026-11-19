import type { AdmLevelCode } from "@scope/consts/models";

export type GetAdmGeojsonFileSizeResponseItem = {
  admLevelCode: AdmLevelCode;
  fileSize: number | null;
  rawURL: string;
  previewURL: string;
};

export type ApiCallPaginationParams = {
  cursor?: string;
  limit: number;
};

export type ApiRequestOptions = {
  signal?: AbortSignal;
};
