import { parseResponse } from "@hono/hono/client";
import { EntityId, Province } from "@scope/types/models";
import { WithRequiredFields } from "@scope/types/utils";
import { BaseApi } from "@/api/base.api.ts";

export class ProvinceApi extends BaseApi {
  async getWithGeoJsonById(
    id: EntityId,
  ): Promise<WithRequiredFields<Province, "geojson">> {
    const province = await parseResponse(this.client.api.provinces[":id"].$get({
      param: { id: id.toString() },
      query: { include_geojson: "1" },
    }));
    return province as WithRequiredFields<Province, "geojson">;
  }
}

let _instance: ProvinceApi | null = null;

export function injectProvinceApi(): ProvinceApi {
  return (_instance ??= new ProvinceApi());
}
