// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "@std/assert";

import type {
  CommuneRecord,
  CommuneSnakeCased,
  DistrictRecord,
  DistrictSnakeCased,
  FokontanyRecord,
  FokontanySnakeCased,
  MadaAdmConfigSnakeCased,
  ProvinceRecord,
  ProvinceSnakeCased,
  RegionRecord,
  RegionSnakeCased,
} from "@scope/types/models";

import {
  compareAdmValues,
  encodeCommuneAttributes,
  getAdmValuesEncodedString,
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isGeoJSONGeometry,
  isProvinceValues,
  isRegionValues,
  mapAdmRecordToValues,
  mapCommuneRecordToValues,
  mapCommuneSnakeToCamel,
  mapDistrictRecordToValues,
  mapDistrictSnakeToCamel,
  mapFokontanyRecordToValues,
  mapFokontanySnakeToCamel,
  mapMadaAdmConfigSnakeToCamel,
  mapProvinceRecordToValues,
  mapProvinceSnakeToCamel,
  mapRegionRecordToValues,
  mapRegionSnakeToCamel,
  parseTimestamp,
} from "./models.helper.ts";

Deno.test("models.helper", async (t) => {
  const dateStr = "2024-01-01T00:00:00.000Z";
  const geojsonObj = { type: "Polygon", coordinates: [[[0, 0]]] } as any;
  const geojsonStr = JSON.stringify(geojsonObj);

  await t.step("mapMadaAdmConfigSnakeToCamel", () => {
    const snake: MadaAdmConfigSnakeCased = {
      id: 1,
      tables_prefix: "test_",
      is_fk_repeated: true,
      is_province_repeated: false,
      is_province_fk_repeated: true,
      has_geojson: false,
      has_adm_level: true,
      is_active: true,
      created_at: dateStr,
      updated_at: dateStr,
    };
    const expected = {
      id: 1,
      tablesPrefix: "test_",
      isFkRepeated: true,
      isProvinceRepeated: false,
      isProvinceFkRepeated: true,
      hasGeojson: false,
      hasAdmLevel: true,
      isActive: true,
      createdAt: dateStr,
      updatedAt: dateStr,
    };
    assertEquals(mapMadaAdmConfigSnakeToCamel(snake), expected);
  });

  await t.step("mapProvinceSnakeToCamel", () => {
    const snake: ProvinceSnakeCased = {
      id: 1,
      province: "Prov",
      geojson: geojsonStr,
      adm_level: 0,
      created_at: dateStr,
      updated_at: dateStr,
    };
    const expected = {
      id: 1,
      province: "Prov",
      geojson: geojsonObj,
      admLevel: 0,
      createdAt: dateStr,
      updatedAt: dateStr,
    };
    assertEquals(mapProvinceSnakeToCamel(snake), expected);
  });

  await t.step("mapRegionSnakeToCamel", () => {
    const snake: RegionSnakeCased = {
      id: 2,
      region: "Reg",
      province: "Prov",
      province_id: 1,
      geojson: geojsonObj, // test passing object directly
      adm_level: 1,
      created_at: dateStr,
      updated_at: dateStr,
    };
    const expected = {
      id: 2,
      region: "Reg",
      province: "Prov",
      provinceId: 1,
      geojson: geojsonObj,
      admLevel: 1,
      createdAt: dateStr,
      updatedAt: dateStr,
    };
    assertEquals(mapRegionSnakeToCamel(snake), expected);
  });

  await t.step("mapDistrictSnakeToCamel", () => {
    const snake: DistrictSnakeCased = {
      id: 3,
      district: "Dist",
      region: "Reg",
      province: "Prov",
      region_id: 2,
      province_id: 1,
      geojson: undefined,
      adm_level: 2,
      created_at: undefined,
      updated_at: undefined,
    };
    const expected = {
      id: 3,
      district: "Dist",
      region: "Reg",
      province: "Prov",
      regionId: 2,
      provinceId: 1,
      geojson: undefined,
      admLevel: 2,
      createdAt: undefined,
      updatedAt: undefined,
    };
    assertEquals(mapDistrictSnakeToCamel(snake), expected);
  });

  await t.step("mapCommuneSnakeToCamel", () => {
    const snake: CommuneSnakeCased = {
      id: 4,
      commune: "Com",
      district: "Dist",
      region: "Reg",
      province: "Prov",
      district_id: 3,
      region_id: 2,
      province_id: 1,
      geojson: null as any,
      adm_level: 3,
      created_at: null as any,
      updated_at: null as any,
    };
    const expected = {
      id: 4,
      commune: "Com",
      district: "Dist",
      region: "Reg",
      province: "Prov",
      districtId: 3,
      regionId: 2,
      provinceId: 1,
      geojson: undefined,
      admLevel: 3,
      createdAt: undefined,
      updatedAt: undefined,
    };
    assertEquals(mapCommuneSnakeToCamel(snake), expected);
  });

  await t.step("mapFokontanySnakeToCamel", () => {
    const snake: FokontanySnakeCased = {
      id: 5,
      fokontany: "Fkt",
      commune: "Com",
      district: "Dist",
      region: "Reg",
      province: "Prov",
      commune_id: 4,
      district_id: 3,
      region_id: 2,
      province_id: 1,
      geojson: "invalid-json", // testing invalid json catch
      adm_level: 4,
      created_at: 1704067200000, // numeric timestamp (2024-01-01)
      updated_at: 1704067200000,
    };
    const expected = {
      id: 5,
      fokontany: "Fkt",
      commune: "Com",
      district: "Dist",
      region: "Reg",
      province: "Prov",
      communeId: 4,
      districtId: 3,
      regionId: 2,
      provinceId: 1,
      geojson: undefined,
      admLevel: 4,
      createdAt: new Date(1704067200000).toISOString(),
      updatedAt: new Date(1704067200000).toISOString(),
    };
    assertEquals(mapFokontanySnakeToCamel(snake), expected);
  });

  const provinceRecord: ProvinceRecord = {
    province: "P",
    admLevel: 0,
    geojson: geojsonObj,
  };
  const regionRecord: RegionRecord = {
    region: "R",
    province: "P",
    provinceId: 1,
    admLevel: 1,
  };
  const districtRecord: DistrictRecord = {
    district: "D",
    region: "R",
    province: "P",
    regionId: 2,
    admLevel: 2,
  };
  const communeRecord: CommuneRecord = {
    commune: "C",
    district: "D",
    region: "R",
    province: "P",
    districtId: 3,
    admLevel: 3,
  };
  const fokontanyRecord: FokontanyRecord = {
    fokontany: "F",
    commune: "C",
    district: "D",
    region: "R",
    province: "P",
    communeId: 4,
    admLevel: 4,
  };

  await t.step("mapRecordToValues", () => {
    assertEquals(mapProvinceRecordToValues(provinceRecord), {
      province: "P",
      admLevel: 0,
      geojson: geojsonObj,
    });
    assertEquals(mapRegionRecordToValues(regionRecord), {
      region: "R",
      province: "P",
      admLevel: 1,
      geojson: undefined,
    });
    assertEquals(mapDistrictRecordToValues(districtRecord), {
      district: "D",
      region: "R",
      province: "P",
      admLevel: 2,
      geojson: undefined,
    });
    assertEquals(mapCommuneRecordToValues(communeRecord), {
      commune: "C",
      district: "D",
      region: "R",
      province: "P",
      admLevel: 3,
      geojson: undefined,
    });
    assertEquals(mapFokontanyRecordToValues(fokontanyRecord), {
      fokontany: "F",
      commune: "C",
      district: "D",
      region: "R",
      province: "P",
      admLevel: 4,
      geojson: undefined,
    });
  });

  await t.step("mapAdmRecordToValues (polymorphic)", () => {
    assertEquals(mapAdmRecordToValues(provinceRecord).province, "P");
    assertEquals((mapAdmRecordToValues(regionRecord) as any).region, "R");
    assertEquals((mapAdmRecordToValues(districtRecord) as any).district, "D");
    assertEquals((mapAdmRecordToValues(communeRecord) as any).commune, "C");
    assertEquals((mapAdmRecordToValues(fokontanyRecord) as any).fokontany, "F");
  });

  await t.step("type guards (isXValues)", () => {
    // using admLevel
    assertEquals(isProvinceValues({ admLevel: 0 } as any), true);
    assertEquals(isProvinceValues({ admLevel: 1 } as any), false);

    // using properties
    assertEquals(isProvinceValues({ province: "P" } as any), true);
    assertEquals(
      isProvinceValues({ province: "P", region: "R" } as any),
      false,
    );

    assertEquals(isRegionValues({ region: "R", province: "P" } as any), true);
    assertEquals(isRegionValues({ region: "R", district: "D" } as any), false);

    assertEquals(isDistrictValues({ district: "D", region: "R" } as any), true);
    assertEquals(
      isDistrictValues({ district: "D", commune: "C" } as any),
      false,
    );

    assertEquals(isCommuneValues({ commune: "C", district: "D" } as any), true);
    assertEquals(
      isCommuneValues({ commune: "C", fokontany: "F" } as any),
      false,
    );

    assertEquals(
      isFokontanyValues({ fokontany: "F", commune: "C" } as any),
      true,
    );
  });

  await t.step("getAdmValuesEncodedString", () => {
    assertEquals(getAdmValuesEncodedString(provinceRecord), "P");
    assertEquals(getAdmValuesEncodedString(regionRecord), "R");
    assertEquals(getAdmValuesEncodedString(districtRecord), "R_D");
    assertEquals(getAdmValuesEncodedString(communeRecord), "R_D_C");
    assertEquals(getAdmValuesEncodedString(fokontanyRecord), "R_D_C_F");
  });

  await t.step("compareAdmValues", () => {
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(provinceRecord),
        mapAdmRecordToValues(provinceRecord),
      ),
      true,
    );
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(provinceRecord),
        { province: "Other" } as any,
      ),
      false,
    );

    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(regionRecord),
        mapAdmRecordToValues(regionRecord),
      ),
      true,
    );
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(regionRecord),
        { region: "Other", province: "P" } as any,
      ),
      false,
    );

    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(districtRecord),
        mapAdmRecordToValues(districtRecord),
      ),
      true,
    );
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(districtRecord),
        { district: "Other", region: "R" } as any,
      ),
      false,
    );

    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(communeRecord),
        mapAdmRecordToValues(communeRecord),
      ),
      true,
    );
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(communeRecord),
        { commune: "Other", district: "D", region: "R" } as any,
      ),
      false,
    );

    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(fokontanyRecord),
        mapAdmRecordToValues(fokontanyRecord),
      ),
      true,
    );
    assertEquals(
      compareAdmValues(
        mapAdmRecordToValues(fokontanyRecord),
        { fokontany: "Other", commune: "C", district: "D", region: "R" } as any,
      ),
      false,
    );
  });

  await t.step("encode attributes", () => {
    assertEquals(
      encodeCommuneAttributes({ commune: "C", district: "D" }),
      "commune:C-district:D",
    );
  });

  await t.step("isGeoJSONGeometry", () => {
    const validPolygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 1], [1, 0], [0, 0]]],
    };
    const validMultiPolygon = {
      type: "MultiPolygon",
      coordinates: [[[[0, 0], [1, 1], [1, 0], [0, 0]]]],
    };
    const invalidType = { type: "Point", coordinates: [0, 0] };
    const emptyCoords = { type: "Polygon", coordinates: [] };
    const wrongStructure = { type: "Polygon", coordinates: [0, 0] };

    assertEquals(isGeoJSONGeometry(validPolygon), true);
    assertEquals(isGeoJSONGeometry(validMultiPolygon), true);
    assertEquals(isGeoJSONGeometry(invalidType), false);
    assertEquals(isGeoJSONGeometry(emptyCoords), false);
    assertEquals(isGeoJSONGeometry(wrongStructure), false);
    assertEquals(isGeoJSONGeometry(null), false);
    assertEquals(isGeoJSONGeometry({}), false);
  });

  await t.step("parseTimestamp", () => {
    const iso = "2024-05-04T00:00:00.000Z";
    const ms = new Date(iso).getTime(); // 1714780800000
    const s = Math.floor(ms / 1000); // 1714780800

    // ISO string
    assertEquals(parseTimestamp(iso), iso);

    // Milliseconds (>= 1e12)
    assertEquals(parseTimestamp(ms), iso);

    // Seconds (< 1e12)
    assertEquals(parseTimestamp(s), iso);

    // Null/Undefined
    assertEquals(parseTimestamp(undefined), undefined);
    assertEquals(parseTimestamp(null as any), undefined);
  });
});
