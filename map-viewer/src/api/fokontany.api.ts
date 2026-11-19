import { parseResponse } from "@hono/hono/client";
import { EntityId, Fokontany } from "@scope/types/models";
import { WithRequiredFields } from "@scope/types/utils";
import { BaseApi } from "@/api/base.api.ts";
import { ApiCallPaginationParams, ApiRequestOptions } from "@/types/api.d.ts";
import {
  CursorPaginatedResult,
  GetManyFokontanysPaginationCursor,
} from "@scope/queries/types";

export type GetFokontanysPaginatedRequestParams = {
  search?: string;
  provinceId?: EntityId;
  regionId?: EntityId;
  districtId?: EntityId;
  communeId?: EntityId;
};

export class FokontanyApi extends BaseApi {
  async getWithGeoJsonById(
    id: EntityId,
  ): Promise<WithRequiredFields<Fokontany, "geojson">> {
    const fokontany = await parseResponse(
      this.client.api.fokontanys[":id"].$get({
        param: { id: id.toString() },
        query: { include_geojson: "1" },
      }),
    );
    return fokontany as WithRequiredFields<Fokontany, "geojson">;
  }

  getManyPaginated(
    paginationParams: ApiCallPaginationParams,
    queryParams: GetFokontanysPaginatedRequestParams,
    options?: ApiRequestOptions,
  ): Promise<
    CursorPaginatedResult<
      GetManyFokontanysPaginationCursor,
      Fokontany
    >
  > {
    return parseResponse(
      this.client.api.fokontanys.$get(
        {
          query: {
            limit: `${paginationParams.limit}`,
            cursor: paginationParams.cursor,
            search: queryParams.search,
            province_id: queryParams.provinceId?.toString(),
            region_id: queryParams.regionId?.toString(),
            district_id: queryParams.districtId?.toString(),
            commune_id: queryParams.communeId?.toString(),
          },
        },
        { init: { signal: options?.signal } },
      ),
    );
  }

  getByCoordinates(lat: number, lng: number): Promise<Fokontany> {
    return parseResponse(
      this.client.api.locations[":lat"][":lng"].fokontany.$get({
        param: { lat: lat.toString(), lng: lng.toString() },
        query: {},
      }),
    );
  }
}

let _instance: FokontanyApi | null = null;

export function injectFokontanyApi(): FokontanyApi {
  return (_instance ??= new FokontanyApi());
}
