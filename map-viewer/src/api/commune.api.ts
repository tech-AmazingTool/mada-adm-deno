import { parseResponse } from "@hono/hono/client";
import { Commune, EntityId } from "@scope/types/models";
import { WithRequiredFields } from "@scope/types/utils";
import {
  CursorPaginatedResult,
  GetManyCommunesPaginationCursor,
} from "@scope/queries/types";
import { BaseApi } from "@/api/base.api.ts";
import { ApiCallPaginationParams, ApiRequestOptions } from "@/types/api.d.ts";

export type GetCommunesPaginatedRequestParams = {
  search?: string;
  districtId?: EntityId;
  regionId?: EntityId;
  provinceId?: EntityId;
};

export class CommuneApi extends BaseApi {
  async getWithGeoJsonById(
    id: EntityId,
  ): Promise<WithRequiredFields<Commune, "geojson">> {
    const commune = await parseResponse(this.client.api.communes[":id"].$get({
      param: { id: id.toString() },
      query: { include_geojson: "1" },
    }));
    return commune as WithRequiredFields<Commune, "geojson">;
  }

  getManyPaginated(
    paginationParams: ApiCallPaginationParams,
    queryParams: GetCommunesPaginatedRequestParams,
    options?: ApiRequestOptions,
  ): Promise<
    CursorPaginatedResult<GetManyCommunesPaginationCursor, Commune>
  > {
    return parseResponse(
      this.client.api.communes.$get(
        {
          query: {
            limit: `${paginationParams.limit}`,
            cursor: paginationParams.cursor,
            search: queryParams.search,
            district_id: queryParams.districtId?.toString(),
            region_id: queryParams.regionId?.toString(),
            province_id: queryParams.provinceId?.toString(),
          },
        },
        { init: { signal: options?.signal } },
      ),
    );
  }
}

let _instance: CommuneApi | null = null;

export function injectCommuneApi(): CommuneApi {
  return (_instance ??= new CommuneApi());
}
