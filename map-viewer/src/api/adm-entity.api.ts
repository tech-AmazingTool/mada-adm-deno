import { parseResponse } from "@hono/hono/client";
import { AdmLevelCode } from "@scope/consts/models";
import { GetAdmEntitiesInBatchResponseBody } from "@scope/rest-api/types";
import { BaseApi } from "@/api/base.api.ts";
import { AdmEntity } from "@scope/types/models";
import {
  CursorPaginatedResult,
  GetAdmEntitiesUnionPaginationCursor,
} from "@scope/queries/types";
import { ApiCallPaginationParams, ApiRequestOptions } from "@/types/api.d.ts";

export type GetAdmEntitiesInUnionRequestParams = {
  from?: AdmLevelCode;
  search?: string;
};

export class AdmEntityApi extends BaseApi {
  getAllInBatch(): Promise<GetAdmEntitiesInBatchResponseBody> {
    return parseResponse(this.client.api.adm_entities.in_batch.$get());
  }

  getAllInUnionPaginated(
    paginationParams: ApiCallPaginationParams,
    queryParams: GetAdmEntitiesInUnionRequestParams,
    options?: ApiRequestOptions,
  ): Promise<
    CursorPaginatedResult<GetAdmEntitiesUnionPaginationCursor, AdmEntity>
  > {
    return parseResponse(
      this.client.api.adm_entities.in_union.$get(
        {
          query: {
            limit: `${paginationParams.limit}`,
            cursor: paginationParams.cursor,
            from: queryParams.from,
            search: queryParams.search,
          },
        },
        { init: { signal: options?.signal } },
      ),
    );
  }
}

let instance: AdmEntityApi | null = null;

export function injectAdmEntityApi(): AdmEntityApi {
  if (!instance) {
    instance = new AdmEntityApi();
  }
  return instance;
}
