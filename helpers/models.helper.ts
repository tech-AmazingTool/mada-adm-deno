import type {
  AdmEntity,
  AdmEntityBSON,
  AdmEntityBSONUnionRecord,
  AdmEntitySnakeCasedUnionRecord,
  AdmRecord,
  AdmValues,
  Commune,
  CommuneAttributes,
  CommuneBSON,
  CommuneRecord,
  CommuneSnakeCased,
  CommuneValues,
  District,
  DistrictBSON,
  DistrictRecord,
  DistrictSnakeCased,
  DistrictValues,
  Entity,
  Fokontany,
  FokontanyBSON,
  FokontanyRecord,
  FokontanySnakeCased,
  FokontanyValues,
  MadaAdmConfig,
  MadaAdmConfigBSON,
  MadaAdmConfigSnakeCased,
  Province,
  ProvinceBSON,
  ProvinceRecord,
  ProvinceSnakeCased,
  ProvinceValues,
  Region,
  RegionBSON,
  RegionRecord,
  RegionSnakeCased,
  RegionValues,
} from "@scope/types/models";
import type { GeoJSONGeometry } from "@scope/types/utils";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";

/**
 * Parses any unformatted timestamp payload into its deterministic ISO standard format.
 *
 * @param timestamp - The incoming date data (often natively passed from databases).
 * @returns The converted ISO standard date string, or undefined if no timestamp was mapped.
 */
export function parseTimestamp(
  timestamp?: Date | string | number,
): string | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  if (typeof timestamp === "number") {
    // If the number is small (e.g., < 10^12), it's likely Unix seconds (SQLite/Postgres default)
    // rather than JS milliseconds. 1e12 ms is year 2001.
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    return new Date(ms).toISOString();
  }
  return new Date(timestamp).toISOString();
}

/**
 * Ensures geojson values from the database are natively cast safely into objects.
 */
function parseGeojson(
  geojson?: string | GeoJSONGeometry,
): GeoJSONGeometry | undefined {
  if (!geojson) return undefined;
  if (typeof geojson === "string") {
    try {
      return JSON.parse(geojson) as GeoJSONGeometry;
    } catch {
      return undefined;
    }
  }
  return geojson;
}

/**
 * Maps a snake cased Mada ADM Config model into its Camel Cased entity.
 *
 * @param entity - The raw snake cased database row config record.
 * @returns The structured camel cased configuration framework entity.
 */
export function mapMadaAdmConfigSnakeToCamel(
  entity: MadaAdmConfigSnakeCased,
): MadaAdmConfig {
  return {
    id: entity.id,
    tablesPrefix: entity.tables_prefix,
    isFkRepeated: entity.is_fk_repeated,
    isProvinceRepeated: entity.is_province_repeated,
    isProvinceFkRepeated: entity.is_province_fk_repeated,
    hasGeojson: entity.has_geojson,
    hasAdmLevel: entity.has_adm_level,
    isActive: !!entity.is_active,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Province model into its Camel Cased entity.
 */
export function mapProvinceSnakeToCamel(entity: ProvinceSnakeCased): Province {
  return {
    id: entity.id,
    province: entity.province,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Region model into its Camel Cased entity.
 */
export function mapRegionSnakeToCamel(entity: RegionSnakeCased): Region {
  return {
    id: entity.id,
    region: entity.region,
    province: entity.province,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased District model into its Camel Cased entity.
 */
export function mapDistrictSnakeToCamel(entity: DistrictSnakeCased): District {
  return {
    id: entity.id,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Commune model into its Camel Cased entity.
 */
export function mapCommuneSnakeToCamel(entity: CommuneSnakeCased): Commune {
  return {
    id: entity.id,
    commune: entity.commune,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    districtId: entity.district_id,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Fokontany model into its Camel Cased entity.
 */
export function mapFokontanySnakeToCamel(
  entity: FokontanySnakeCased,
): Fokontany {
  return {
    id: entity.id,
    fokontany: entity.fokontany,
    commune: entity.commune,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    communeId: entity.commune_id,
    districtId: entity.district_id,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a Province record to its pure values (stripping any DB-specific IDs).
 */
export function mapProvinceRecordToValues(
  record: ProvinceRecord,
): ProvinceValues {
  return {
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Region record to its pure values (stripping any DB-specific IDs).
 */
export function mapRegionRecordToValues(record: RegionRecord): RegionValues {
  return {
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a District record to its pure values (stripping any DB-specific IDs).
 */
export function mapDistrictRecordToValues(
  record: DistrictRecord,
): DistrictValues {
  return {
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Commune record to its pure values (stripping any DB-specific IDs).
 */
export function mapCommuneRecordToValues(record: CommuneRecord): CommuneValues {
  return {
    commune: record.commune,
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Fokontany record to its pure values (stripping any DB-specific IDs).
 */
export function mapFokontanyRecordToValues(
  record: FokontanyRecord,
): FokontanyValues {
  return {
    fokontany: record.fokontany,
    commune: record.commune,
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Polymorphic mapper that converts any ADM record into its corresponding values.
 */
export function mapAdmRecordToValues(record: AdmRecord): AdmValues {
  if (isFokontanyValues(record)) {
    return mapFokontanyRecordToValues(record as FokontanyRecord);
  } else if (isCommuneValues(record)) {
    return mapCommuneRecordToValues(record as CommuneRecord);
  } else if (isDistrictValues(record)) {
    return mapDistrictRecordToValues(record as DistrictRecord);
  } else if (isRegionValues(record)) {
    return mapRegionRecordToValues(record as RegionRecord);
  } else {
    return mapProvinceRecordToValues(record as ProvinceRecord);
  }
}

/**
 * Type guard that checks if a value object represents a province.
 *
 * @param values - The administrative values or record to check.
 * @returns True if the values represent a province, false otherwise.
 */
export function isProvinceValues(
  values: AdmValues | AdmRecord,
): values is ProvinceValues {
  if (typeof values.admLevel === "number") return values.admLevel === 0;
  return (
    "province" in values &&
    Object.keys(values).every((key) => {
      return !["region", "district", "commune", "fokontany"].includes(key);
    })
  );
}

/**
 * Type guard that checks if a value object represents a region.
 *
 * @param values - The administrative values or record to check.
 * @returns True if the values represent a region, false otherwise.
 */
export function isRegionValues(
  values: AdmValues | AdmRecord,
): values is RegionValues {
  if (typeof values.admLevel === "number") return values.admLevel === 1;
  return (
    "region" in values &&
    Object.keys(values).every((key) => {
      return !["district", "commune", "fokontany"].includes(key);
    })
  );
}

/**
 * Type guard that checks if a value object represents a district.
 *
 * @param values - The administrative values or record to check.
 * @returns True if the values represent a district, false otherwise.
 */
export function isDistrictValues(
  values: AdmValues | AdmRecord,
): values is DistrictValues {
  if (typeof values.admLevel === "number") return values.admLevel === 2;
  return (
    "district" in values &&
    Object.keys(values).every((key) => {
      return !["commune", "fokontany"].includes(key);
    })
  );
}

/**
 * Type guard that checks if a value object represents a commune.
 *
 * @param values - The administrative values or record to check.
 * @returns True if the values represent a commune, false otherwise.
 */
export function isCommuneValues(
  values: AdmValues | AdmRecord,
): values is CommuneValues {
  if (typeof values.admLevel === "number") return values.admLevel === 3;
  return (
    "commune" in values &&
    Object.keys(values).every((key) => {
      return !["fokontany"].includes(key);
    })
  );
}

/**
 * Type guard that checks if a value object represents a fokontany.
 *
 * @param values - The administrative values or record to check.
 * @returns True if the values represent a fokontany, false otherwise.
 */
export function isFokontanyValues(
  values: AdmValues | AdmRecord,
): values is FokontanyValues {
  if (typeof values.admLevel === "number") return values.admLevel === 4;
  return "fokontany" in values;
}

/**
 * Generates a unique deterministic string representation for administrative values.
 *
 * For levels below province/region, it includes parent names to ensure uniqueness.
 *
 * @param values - The administrative values or record to encode.
 * @returns A unique string identifying the administrative unit.
 */
export function getAdmValuesEncodedString(
  values: AdmValues | AdmRecord,
): string {
  if (isProvinceValues(values)) return (values as ProvinceRecord).province;
  else if (isRegionValues(values)) return (values as RegionRecord).region;

  // For lower levels, we use parent names to create a unique ID
  let encodedString = (values as RegionRecord).region;
  if (isDistrictValues(values)) {
    encodedString += `_${(values as DistrictRecord).district}`;
  } else if (isCommuneValues(values)) {
    encodedString += `_${(values as CommuneRecord).district}_${
      (values as CommuneRecord).commune
    }`;
  } else if (isFokontanyValues(values)) {
    encodedString += `_${(values as FokontanyRecord).district}_${
      (values as FokontanyRecord).commune
    }_${(values as FokontanyRecord).fokontany}`;
  }
  return encodedString;
}

/**
 * Compares two sets of administrative values for deep equality.
 *
 * @param admValues1 - The first set of values to compare.
 * @param admValues2 - The second set of values to compare.
 * @returns True if both values represent the same administrative unit, false otherwise.
 */
export function compareAdmValues(
  admValues1: AdmValues,
  admValues2: AdmValues,
): boolean {
  if (isFokontanyValues(admValues1)) {
    return isFokontanyValues(admValues2) &&
      admValues1.fokontany === admValues2.fokontany &&
      admValues1.commune === admValues2.commune &&
      admValues1.district === admValues2.district &&
      admValues1.region === admValues2.region;
  } else if (isCommuneValues(admValues1)) {
    return isCommuneValues(admValues2) &&
      admValues1.commune === admValues2.commune &&
      admValues1.district === admValues2.district &&
      admValues1.region === admValues2.region;
  } else if (isDistrictValues(admValues1)) {
    return isDistrictValues(admValues2) &&
      admValues1.district === admValues2.district &&
      admValues1.region === admValues2.region;
  } else if (isRegionValues(admValues1)) {
    return isRegionValues(admValues2) &&
      admValues1.region === admValues2.region;
  } else {
    return admValues1.province === admValues2.province;
  }
}

export function encodeCommuneAttributes(attr: CommuneAttributes): string {
  return `commune:${attr.commune}-district:${attr.district}`;
}
/**
 * Type guard that checks if a value is a valid GeoJSON geometry (Polygon or MultiPolygon).
 * It also verifies that the geometry contains at least one coordinate pair.
 *
 * @param value - The value to check.
 * @returns True if the value is a valid GeoJSON Polygon or MultiPolygon with coordinates.
 */
export function isGeoJSONGeometry(value: unknown): value is GeoJSONGeometry {
  if (!value || typeof value !== "object") return false;
  const geom = value as GeoJSONGeometry;

  if (geom.type === "Polygon") {
    return Array.isArray(geom.coordinates) &&
      geom.coordinates.length > 0 &&
      Array.isArray(geom.coordinates[0]) &&
      geom.coordinates[0].length > 0 &&
      Array.isArray(geom.coordinates[0][0]) &&
      geom.coordinates[0][0].length === 2;
  }

  if (geom.type === "MultiPolygon") {
    return Array.isArray(geom.coordinates) &&
      geom.coordinates.length > 0 &&
      Array.isArray(geom.coordinates[0]) &&
      geom.coordinates[0].length > 0 &&
      Array.isArray(geom.coordinates[0][0]) &&
      geom.coordinates[0][0].length > 0 &&
      Array.isArray(geom.coordinates[0][0][0]) &&
      geom.coordinates[0][0][0].length === 2;
  }

  return false;
}

/**
 * Maps a MongoDB BSON Mada ADM Config model into its Camel Cased entity.
 *
 * @param bson - The raw BSON document from MongoDB.
 * @returns The structured camel cased configuration framework entity.
 */
export function mapMadaAdmConfigBsonToEntity(
  bson: MadaAdmConfigBSON,
): MadaAdmConfig {
  const { _id, createdAt, updatedAt, ...rest } = bson;
  return {
    ...rest,
    isActive: !!bson.isActive,
    id: _id.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Maps a MongoDB BSON Province model into its Camel Cased entity.
 */
export function mapProvinceBsonToEntity(bson: ProvinceBSON): Province {
  const { _id, createdAt, updatedAt, ...rest } = bson;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Maps a MongoDB BSON Region model into its Camel Cased entity.
 */
export function mapRegionBsonToEntity(bson: RegionBSON): Region {
  const { _id, createdAt, updatedAt, provinceId, ...rest } = bson;
  return {
    ...rest,
    id: _id.toString(),
    provinceId: provinceId.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Maps a MongoDB BSON District model into its Camel Cased entity.
 */
export function mapDistrictBsonToEntity(bson: DistrictBSON): District {
  const { _id, createdAt, updatedAt, regionId, provinceId, ...rest } = bson;
  return {
    ...rest,
    id: _id.toString(),
    regionId: regionId.toString(),
    provinceId: provinceId?.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Maps a MongoDB BSON Commune model into its Camel Cased entity.
 */
export function mapCommuneBsonToEntity(bson: CommuneBSON): Commune {
  const {
    _id,
    createdAt,
    updatedAt,
    districtId,
    regionId,
    provinceId,
    ...rest
  } = bson;
  return {
    ...rest,
    id: _id.toString(),
    districtId: districtId.toString(),
    regionId: regionId?.toString(),
    provinceId: provinceId?.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Maps a MongoDB BSON Fokontany model into its Camel Cased entity.
 */
export function mapFokontanyBsonToEntity(bson: FokontanyBSON): Fokontany {
  const {
    _id,
    createdAt,
    updatedAt,
    communeId,
    districtId,
    regionId,
    provinceId,
    ...rest
  } = bson;
  return {
    ...rest,
    id: _id.toString(),
    communeId: communeId.toString(),
    districtId: districtId?.toString(),
    regionId: regionId?.toString(),
    provinceId: provinceId?.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

/**
 * Polymorphic mapper that converts any BSON ADM entity into its corresponding Camel Cased entity.
 *
 * @param bson - The BSON document to convert.
 * @returns The converted application entity.
 */
export function mapAdmEntityBsonToEntity(bson: AdmEntityBSON): AdmEntity {
  const record = bson as unknown as AdmRecord;
  if (isFokontanyValues(record)) {
    return mapFokontanyBsonToEntity(bson as FokontanyBSON);
  }
  if (isCommuneValues(record)) {
    return mapCommuneBsonToEntity(bson as CommuneBSON);
  }
  if (isDistrictValues(record)) {
    return mapDistrictBsonToEntity(bson as DistrictBSON);
  }
  if (isRegionValues(record)) return mapRegionBsonToEntity(bson as RegionBSON);
  return mapProvinceBsonToEntity(bson as ProvinceBSON);
}

/**
 * Maps an ADM entity union BSON record to its correponding ADM entity
 * @param record - The ADM entity union record
 * @returns The converted ADM entity
 */
export function mapAdmEntityUnionBSONRecordToEntity(
  record: AdmEntityBSONUnionRecord,
): AdmEntity {
  const admLevel = ADM_LEVEL_CODES_INDEXED[record.admLevel];

  const baseEntity: Entity<Record<string, unknown>> = {
    id: record._id.toString(),
    createdAt: record.createdAt?.toISOString(),
    updatedAt: record.updatedAt?.toISOString(),
    admLevel,
  };

  switch (admLevel) {
    case AdmLevelCode.PROVINCE: {
      const province: Province = {
        ...baseEntity,
        province: record.province!,
        admLevel: record.admLevel,
      };
      return province;
    }

    case AdmLevelCode.REGION: {
      const region: Region = {
        ...baseEntity,
        region: record.region!,
        province: record.province!,
        provinceId: record.provinceId!.toString(),
        admLevel: record.admLevel,
      };
      return region;
    }

    case AdmLevelCode.DISTRICT: {
      const district: District = {
        ...baseEntity,
        district: record.district!,
        region: record.region!,
        regionId: record.regionId!.toString(),
        admLevel: record.admLevel,
      };
      if (record.province) district.province = record.province;
      if (record.provinceId) district.provinceId = record.provinceId.toString();
      return district;
    }

    case AdmLevelCode.COMMUNE: {
      const commune: Commune = {
        ...baseEntity,
        commune: record.commune!,
        district: record.district!,
        region: record.region!,
        districtId: record.districtId!.toString(),
        admLevel: record.admLevel,
      };
      if (record.regionId) commune.regionId = record.regionId.toString();
      if (record.province) commune.province = record.province;
      if (record.provinceId) commune.provinceId = record.provinceId.toString();
      return commune;
    }

    case AdmLevelCode.FOKONTANY: {
      const fokontany: Fokontany = {
        ...baseEntity,
        fokontany: record.fokontany!,
        district: record.district!,
        region: record.region!,
        commune: record.commune!,
        communeId: record.communeId!.toString(),
        admLevel: record.admLevel,
      };
      if (record.districtId) {
        fokontany.districtId = record.districtId.toString();
      }
      if (record.regionId) fokontany.regionId = record.regionId.toString();
      if (record.province) fokontany.province = record.province;
      if (record.provinceId) {
        fokontany.provinceId = record.provinceId.toString();
      }
      return fokontany;
    }

    default:
      throw new Error(
        `Unknown ADM level code: ${admLevel satisfies never} when mapping adm entity union record to entity.`,
      );
  }
}

/**
 * Maps an ADM entity union snake cased record to its correponding ADM entity
 * @param record - The ADM entity union record
 * @returns The converted ADM entity
 */
export function mapAdmEntityUnionSnakeCasedRecordToEntity(
  record: AdmEntitySnakeCasedUnionRecord,
): AdmEntity {
  const admLevel = ADM_LEVEL_CODES_INDEXED[record.adm_level];

  const baseEntity: Entity<Record<string, unknown>> = {
    id: record.id,
    createdAt: record.created_at
      ? new Date(record.created_at).toISOString()
      : undefined,
    updatedAt: record.updated_at
      ? new Date(record.updated_at).toISOString()
      : undefined,
    admLevel,
  };

  switch (admLevel) {
    case AdmLevelCode.PROVINCE: {
      const province: Province = {
        ...baseEntity,
        province: record.province!,
        admLevel: record.adm_level,
      };
      return province;
    }

    case AdmLevelCode.REGION: {
      const region: Region = {
        ...baseEntity,
        region: record.region!,
        province: record.province!,
        provinceId: record.province_id!,
        admLevel: record.adm_level,
      };
      return region;
    }

    case AdmLevelCode.DISTRICT: {
      const district: District = {
        ...baseEntity,
        district: record.district!,
        region: record.region!,
        regionId: record.region_id!,
        admLevel: record.adm_level,
      };
      if (record.province) district.province = record.province;
      if (record.province_id) district.provinceId = record.province_id;
      return district;
    }

    case AdmLevelCode.COMMUNE: {
      const commune: Commune = {
        ...baseEntity,
        commune: record.commune!,
        district: record.district!,
        region: record.region!,
        districtId: record.district_id!,
        admLevel: record.adm_level,
      };
      if (record.region_id) commune.regionId = record.region_id;
      if (record.province) commune.province = record.province;
      if (record.province_id) commune.provinceId = record.province_id;
      return commune;
    }

    case AdmLevelCode.FOKONTANY: {
      const fokontany: Fokontany = {
        ...baseEntity,
        fokontany: record.fokontany!,
        district: record.district!,
        region: record.region!,
        commune: record.commune!,
        communeId: record.commune_id!,
        admLevel: record.adm_level,
      };
      if (record.district_id) fokontany.districtId = record.district_id;
      if (record.region_id) fokontany.regionId = record.region_id;
      if (record.province) fokontany.province = record.province;
      if (record.province_id) fokontany.provinceId = record.province_id;
      return fokontany;
    }

    default:
      throw new Error(
        `Unknown ADM level code: ${admLevel satisfies never} when mapping adm entity union record to entity.`,
      );
  }
}
