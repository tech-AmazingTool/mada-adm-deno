import { parseResponse } from "@hono/hono/client";
import { EntityId, Region } from "@scope/types/models";
import { WithRequiredFields } from "@scope/types/utils";
import { BaseApi } from "@/api/base.api.ts";

export class RegionApi extends BaseApi {
  async getWithGeoJsonById(
    id: EntityId,
  ): Promise<WithRequiredFields<Region, "geojson">> {
    const region = await parseResponse(this.client.api.regions[":id"].$get({
      param: { id: id.toString() },
      query: { include_geojson: "1" },
    }));
    return region as WithRequiredFields<Region, "geojson">;
  }
}

let _instance: RegionApi | null = null;

export function injectRegionApi(): RegionApi {
  return (_instance ??= new RegionApi());
}
