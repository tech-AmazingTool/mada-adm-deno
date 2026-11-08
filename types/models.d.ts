import type { ObjectId, WithId } from "mongodb";
import type { AdmLevelCode } from "@scope/consts/models";
import type { GeoJSONGeometry, ReplaceKeys } from "@scope/types/utils";

export type Nullable<T> = T | null;

export type WithTimestamps<T> = {
  createdAt?: Date;
  updatedAt?: Date;
} & T;

export type EntityId = number | string;

export type EntitySnakeCased<T> = {
  id: number;
  created_at?: Date | string | number;
  updated_at?: Date | string | number;
} & T;
export type Entity<T> = {
  id: EntityId;
  createdAt?: string;
  updatedAt?: string;
} & T;

/**
 * Configuration values defining the conventions, structure, and relationships of the ADM tables.
 */
export type MadaAdmConfigValues = {
  /** The prefix used for all ADM table names. */
  tablesPrefix: Nullable<string>;
  /** Indicates whether foreign key columns are repeated across subsequent child tables. */
  isFkRepeated: boolean;
  /** Indicates whether the province name column is repeated across sub-administrative tables. */
  isProvinceRepeated: boolean;
  /** Indicates whether the province foreign key is repeated across sub-administrative tables. */
  isProvinceFkRepeated: boolean;
  /** Indicates whether the tables include spatial GeoJSON geometries. */
  hasGeojson: boolean;
  /** Indicates whether the tables include an admLevel column natively. */
  hasAdmLevel: boolean;
  /** Indicates whether this configuration is currently active. */
  isActive?: boolean;
};
export type MadaAdmConfigBSONRecord = MadaAdmConfigValues & {
  isActive: boolean;
};
export type MadaAdmConfigBSONRecordWithTimestamps = WithTimestamps<
  MadaAdmConfigBSONRecord
>;

/**
 * Snake-cased version of MadaAdmConfigValues, representing the exact database row structure.
 */
export type MadaAdmConfigSnakeCased = EntitySnakeCased<{
  tables_prefix: Nullable<string>;
  is_fk_repeated: boolean;
  is_province_repeated: boolean;
  is_province_fk_repeated: boolean;
  has_geojson: boolean;
  has_adm_level: boolean;
  is_active: boolean;
}>;

/**
 * The MongoDB native representation of MadaAdmConfigValues.
 */
export type MadaAdmConfigBSON = WithId<MadaAdmConfigBSONRecordWithTimestamps>;

/**
 * The standard application entity wrapper for MadaAdmConfig.
 */
export type MadaAdmConfig = Entity<MadaAdmConfigValues> & {
  isActive: boolean;
};

export type AdmProperties = {
  shapeName: string;
  shapeType: AdmLevelCode;
  shapeID: string;
};

export type HasGeoJsonLowLevel<T> = T & {
  geojson?: GeoJSONGeometry | string;
};
export type HasGeoJson<T> = T & {
  geojson?: GeoJSONGeometry;
};

export type HasAdmLevelLowLevel<T> = T & {
  adm_level?: number;
};
export type HasAdmLevel<T> = T & {
  admLevel?: number;
};

export type ProvinceValues = HasAdmLevel<
  HasGeoJson<{
    province: string;
  }>
>;
export type ProvinceRecord = ProvinceValues;
export type ProvinceBSONRecord = ProvinceValues;
export type ProvinceBSONRecordWithTimestamps = WithTimestamps<
  ProvinceBSONRecord
>;
export type ProvinceSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      province: string;
    }>
  >
>;
export type ProvinceBSON = WithId<ProvinceBSONRecordWithTimestamps>;
export type Province = Entity<ProvinceValues>;

export type RegionValues = HasAdmLevel<
  HasGeoJson<{
    region: string;
    province: string;
  }>
>;
export type RegionFks = { provinceId: EntityId };
export type RegionFksSnakeCased = { province_id: EntityId };
export type RegionRecord = RegionValues & RegionFks;
export type RegionBSONRecord = RegionValues & ReplaceKeys<RegionFks, ObjectId>;
export type RegionBSONRecordWithTimestamps = WithTimestamps<RegionBSONRecord>;
export type RegionSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        region: string;
        province: string;
      } & RegionFksSnakeCased
    >
  >
>;
export type RegionBSON = WithId<RegionBSONRecordWithTimestamps>;
export type Region = Entity<RegionRecord>;

export type DistrictValues = HasAdmLevel<
  HasGeoJson<{
    district: string;
    region: string;
    province?: string;
  }>
>;
export type DistrictFks = { regionId: EntityId; provinceId?: EntityId };
export type DistrictFksSnakeCased = {
  region_id: EntityId;
  province_id?: EntityId;
};
export type DistrictRecord = DistrictValues & DistrictFks;
export type DistrictBSONRecord =
  & DistrictValues
  & ReplaceKeys<DistrictFks, ObjectId>;
export type DistrictBSONRecordWithTimestamps = WithTimestamps<
  DistrictBSONRecord
>;
export type DistrictSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        district: string;
        region: string;
        province?: string;
      } & DistrictFksSnakeCased
    >
  >
>;
export type DistrictBSON = WithId<DistrictBSONRecordWithTimestamps>;
export type District = Entity<DistrictRecord>;

export type CommuneValues = HasAdmLevel<
  HasGeoJson<{
    commune: string;
    district: string;
    region: string;
    province?: string;
  }>
>;
export type CommuneFks = {
  districtId: EntityId;
  regionId?: EntityId;
  provinceId?: EntityId;
};
export type CommuneFksSnakeCased = {
  district_id: EntityId;
  region_id?: EntityId;
  province_id?: EntityId;
};
export type CommuneRecord = CommuneValues & CommuneFks;
export type CommuneBSONRecord =
  & CommuneValues
  & ReplaceKeys<CommuneFks, ObjectId>;
export type CommuneBSONRecordWithTimestamps = WithTimestamps<CommuneBSONRecord>;
export type CommuneSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        commune: string;
        district: string;
        region: string;
        province?: string;
      } & CommuneFksSnakeCased
    >
  >
>;
export type CommuneBSON = WithId<CommuneBSONRecordWithTimestamps>;
export type Commune = Entity<CommuneRecord>;

export type FokontanyValues = HasAdmLevel<
  HasGeoJson<{
    fokontany: string;
    commune: string;
    district: string;
    region: string;
    province?: string;
  }>
>;
export type FokontanyFks = {
  communeId: EntityId;
  districtId?: EntityId;
  regionId?: EntityId;
  provinceId?: EntityId;
};
export type FokontanyFksSnakeCased = {
  commune_id: EntityId;
  district_id?: EntityId;
  region_id?: EntityId;
  province_id?: EntityId;
};
export type FokontanyRecord = FokontanyValues & FokontanyFks;
export type FokontanyBSONRecord =
  & FokontanyValues
  & ReplaceKeys<FokontanyFks, ObjectId>;
export type FokontanyBSONRecordWithTimestamps = WithTimestamps<
  FokontanyBSONRecord
>;
export type FokontanySnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        fokontany: string;
        commune: string;
        district: string;
        region: string;
        province?: string;
      } & FokontanyFksSnakeCased
    >
  >
>;
export type FokontanyBSON = WithId<FokontanyBSONRecordWithTimestamps>;
export type Fokontany = Entity<FokontanyRecord>;

export type AdmEntity = Province | Region | District | Commune | Fokontany;

export type AdmEntitySnakeCased =
  | ProvinceSnakeCased
  | RegionSnakeCased
  | DistrictSnakeCased
  | CommuneSnakeCased
  | FokontanySnakeCased;

export type AdmValues =
  | ProvinceValues
  | RegionValues
  | DistrictValues
  | CommuneValues
  | FokontanyValues;

export type AdmRecord =
  | ProvinceRecord
  | RegionRecord
  | DistrictRecord
  | CommuneRecord
  | FokontanyRecord;

export type AdmEntityFks = RegionFks | DistrictFks | CommuneFks | FokontanyFks;

export type AdmValuesDiscriminated =
  | {
    admLevelCode: AdmLevelCode.PROVINCE;
    values: ProvinceRecord;
  }
  | {
    admLevelCode: AdmLevelCode.REGION;
    values: RegionRecord;
  }
  | {
    admLevelCode: AdmLevelCode.DISTRICT;
    values: DistrictRecord;
  }
  | {
    admLevelCode: AdmLevelCode.COMMUNE;
    values: CommuneRecord;
  }
  | {
    admLevelCode: AdmLevelCode.FOKONTANY;
    values: FokontanyRecord;
  };

export type AdmEntityDiscriminated = {
  admLevelCode: AdmLevelCode.PROVINCE;
  entity: Province;
} | {
  admLevelCode: AdmLevelCode.REGION;
  entity: Region;
} | {
  admLevelCode: AdmLevelCode.DISTRICT;
  entity: District;
} | {
  admLevelCode: AdmLevelCode.COMMUNE;
  entity: Commune;
} | {
  admLevelCode: AdmLevelCode.FOKONTANY;
  entity: Fokontany;
};

export type AdmEntityBSON =
  | ProvinceBSON
  | RegionBSON
  | DistrictBSON
  | CommuneBSON
  | FokontanyBSON;

export type AdmRecordBSONWithTimestamps =
  | ProvinceBSONRecordWithTimestamps
  | RegionBSONRecordWithTimestamps
  | DistrictBSONRecordWithTimestamps
  | CommuneBSONRecordWithTimestamps
  | FokontanyBSONRecordWithTimestamps;

/**
 * Attributes used to uniquely identify a province.
 */
export type ProvinceAttributes = { province: string };

/**
 * Attributes used to uniquely identify a region.
 */
export type RegionAttributes = { region: string };

/**
 * Attributes used to uniquely identify a district.
 */
export type DistrictAttributes = { district: string };

/**
 * Attributes used to uniquely identify a commune.
 */
export type CommuneAttributes = {
  commune: string;
  district: string;
};

/**
 * Attributes used to uniquely identify a fokontany.
 */
export type FokontanyAttributes = {
  fokontany: string;
  commune: string;
  district: string;
};

export type AdmAttributes =
  & Record<string, string>
  & (
    | ProvinceAttributes
    | RegionAttributes
    | DistrictAttributes
    | CommuneAttributes
    | FokontanyAttributes
  );

export type AdmEntityUnionRecord = {
  id: EntityId;
  admLevel: number;
  province: Nullable<string>;
  provinceId: Nullable<EntityId>;
  region: Nullable<string>;
  regionId: Nullable<EntityId>;
  district: Nullable<string>;
  districtId: Nullable<EntityId>;
  commune: Nullable<string>;
  communeId: Nullable<EntityId>;
  fokontany: Nullable<string>;
  fokontanyId: Nullable<EntityId>;
  createdAt?: string;
  updatedAt?: string;
};

export type AdmEntitySnakeCasedUnionRecord = {
  id: EntityId;
  adm_level: number;
  province: Nullable<string>;
  province_id: Nullable<EntityId>;
  region: Nullable<string>;
  region_id: Nullable<EntityId>;
  district: Nullable<string>;
  district_id: Nullable<EntityId>;
  commune: Nullable<string>;
  commune_id: Nullable<EntityId>;
  fokontany: Nullable<string>;
  fokontany_id: Nullable<EntityId>;
  created_at?: string | number | Date;
  updated_at?: string | number | Date;
};

export type AdmEntityBSONUnionRecord = {
  _id: ObjectId;
  admLevel: number;
  province: Nullable<string>;
  provinceId: Nullable<ObjectId>;
  region: Nullable<string>;
  regionId: Nullable<ObjectId>;
  district: Nullable<string>;
  districtId: Nullable<ObjectId>;
  commune: Nullable<string>;
  communeId: Nullable<ObjectId>;
  fokontany: Nullable<string>;
  fokontanyId: Nullable<ObjectId>;
  createdAt?: Date;
  updatedAt?: Date;
};
