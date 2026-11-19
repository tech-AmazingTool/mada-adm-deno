import { parseResponse } from "@hono/hono/client";
import { District, EntityId } from "@scope/types/models";
import { WithRequiredFields } from "@scope/types/utils";
import {
  CursorPaginatedResult,
  GetManyDistrictsPaginationCursor,
} from "@scope/queries/types";
import { BaseApi } from "@/api/base.api.ts";
import { ApiCallPaginationParams, ApiRequestOptions } from "@/types/api.d.ts";

export type GetDistrictsPaginatedRequestParams = {
  search?: string;
  regionId?: EntityId;
  provinceId?: EntityId;
};

export class DistrictApi extends BaseApi {
  async getWithGeoJsonById(
    id: EntityId,
  ): Promise<WithRequiredFields<District, "geojson">> {
    const district = await parseResponse(this.client.api.districts[":id"].$get({
      param: { id: id.toString() },
      query: { include_geojson: "1" },
    }));
    return district as WithRequiredFields<District, "geojson">;
  }

  async getWithGeoJsonByFokontanyId(
    fokontanyId: EntityId,
  ): Promise<WithRequiredFields<District, "geojson">> {
    const district = await parseResponse(
      this.client.api.fokontanys[":id"].district.$get({
        param: { id: fokontanyId.toString() },
        query: { include_geojson: "1" },
      }),
    );
    return district as WithRequiredFields<District, "geojson">;
  }

  getManyPaginated(
    paginationParams: ApiCallPaginationParams,
    queryParams: GetDistrictsPaginatedRequestParams,
    options?: ApiRequestOptions,
  ): Promise<
    CursorPaginatedResult<GetManyDistrictsPaginationCursor, District>
  > {
    return parseResponse(
      this.client.api.districts.$get(
        {
          query: {
            limit: `${paginationParams.limit}`,
            cursor: paginationParams.cursor,
            search: queryParams.search,
            region_id: queryParams.regionId?.toString(),
            province_id: queryParams.provinceId?.toString(),
          },
        },
        { init: { signal: options?.signal } },
      ),
    );
  }
}

let _instance: DistrictApi | null = null;

export function injectDistrictApi(): DistrictApi {
  return (_instance ??= new DistrictApi());
}
