import type { Transaction } from "@db/postgres";
import type { ClientSession } from "mongodb";
import type { PoolConnection } from "mysql2/promise";
import type { DbType } from "@scope/consts/db";
import type { AdmLevelCode } from "@scope/consts/models";
import type { MaybePromise } from "./utils.d.ts";
import type {
  AdmEntityBSON,
  Commune,
  CommuneAttributes,
  CommuneRecord,
  District,
  DistrictAttributes,
  DistrictRecord,
  EntityId,
  Fokontany,
  FokontanyAttributes,
  FokontanyRecord,
  MadaAdmConfig,
  MadaAdmConfigBSON,
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  Region,
  RegionRecord,
} from "./models.d.ts";

export type {
  AdmEntityBSON,
  Commune,
  CommuneAttributes,
  CommuneRecord,
  District,
  DistrictAttributes,
  DistrictRecord,
  EntityId,
  Fokontany,
  FokontanyAttributes,
  FokontanyRecord,
  MadaAdmConfig,
  MadaAdmConfigBSON,
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  Region,
  RegionRecord,
};

/**
 * Represents the transaction context for a specific database type.
 */
export type PostgresTransactionContext = {
  dbType: DbType.Postgres;
  tx: Transaction;
};

export type SQLiteTransactionContext = {
  dbType: DbType.SQLite;
};

export type MySQLTransactionContext = {
  dbType: DbType.MySQL;
  connection: PoolConnection;
};

export type MongoDbTransactionContext = {
  dbType: DbType.MongoDB;
  session: ClientSession;
};

/**
 * Represents the transaction context for a specific database type.
 */
export type DbTransactionContext =
  | PostgresTransactionContext
  | SQLiteTransactionContext
  | MySQLTransactionContext
  | MongoDbTransactionContext;

/**
 * Represents the options for a database transaction.
 */
export type TransactionOptions = {
  mongo?: {
    readConcern?: "local" | "majority" | "snapshot";
  };
};

/**
 * Represents a database connection.
 */
export interface DbConnection {
  /**
   * The lastest db connection params used to connect to the database.
   */
  get params(): DbConnectionParams;

  /**
   * Attempts to establish a connection to the database.
   * @param params - The parameters for connecting to the database.
   */
  connect(params: DbConnectionParams): MaybePromise<void>;

  /**
   * Closes the active database connection.
   */
  close(): MaybePromise<void>;

  /**
   * Executes the given callback inside a database transaction.
   * The callback can be synchronous or asynchronous.
   *
   * @param callback - The function to execute within the transaction.
   * @param options - The options for the transaction.
   * @returns The result of the callback.
   */
  transaction<TReturn>(
    callback: (
      transactionContext: DbTransactionContext,
    ) => MaybePromise<TReturn>,
    options?: TransactionOptions,
  ): MaybePromise<TReturn>;
}

/**
 * Detailed configuration for a PostgreSQL database connection.
 */
export interface PostgresConnectionConfig {
  /** The hostname or IP address of the database server. */
  host: string;
  /** The port number the database server is listening on. */
  port: number;
  /** The username to use for authentication. */
  username: string;
  /** The password to use for authentication. */
  password: string;
  /** The name of the database to connect to. */
  database: string;
  /** Whether to use SSL for the connection. */
  ssl?: boolean;
  /** Maximum number of connections in the pool. */
  connectionLimit?: number;
  /**
   * Filename of a CA certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `caCertPath` when both are provided.
   */
  caCertFile?: string;
  /** Full pathname to the CA certificate file, used when `caCertFile` is not set. */
  caCertPath?: string;
}

/**
 * Connection parameters specifically for a PostgreSQL database.
 */
export interface PostgresConnectionParams {
  /** The type of database, fixed to Postgres. */
  dbType: DbType.Postgres;
  /** Either a connection string (URL) or a configuration object. */
  connection: string | PostgresConnectionConfig;
}

/**
 * Connection parameters specifically for a SQLite database.
 */
export interface SQLiteConnectionParams {
  /** The type of database, fixed to SQLite. */
  dbType: DbType.SQLite;
  /** The path to the SQLite database file. */
  dbPath?: string;
  /** The filename of the SQLite database file. */
  dbFile?: string;
}

/**
 * Detailed configuration for a MySQL database connection.
 */
export interface MySQLConnectionConfig {
  /** The hostname or IP address of the database server. */
  host: string;
  /** The port number the database server is listening on. */
  port: number;
  /** The username to use for authentication. */
  username: string;
  /** The password to use for authentication. */
  password: string;
  /** The name of the database to connect to. */
  database: string;
  /** Whether to use SSL for the connection. */
  ssl?: boolean;
  /**
   * Filename of a CA certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `caCertPath` when both are provided.
   */
  caCertFile?: string;
  /** Full pathname to the CA certificate file, used when `caCertFile` is not set. */
  caCertPath?: string;
  /**
   * Filename of a client certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `certPath` when both are provided.
   */
  certFile?: string;
  /** Full pathname to the client certificate file, used when `certFile` is not set. */
  certPath?: string;
  /**
   * Filename of a client key located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `keyPath` when both are provided.
   */
  keyFile?: string;
  /** Full pathname to the client key file, used when `keyFile` is not set. */
  keyPath?: string;
  /** Maximum number of connections in the pool. */
  connectionLimit?: number;
  /** Maximum numner of idle connections in the pool */
  maxIdle?: number;
  /** The maximum time a connection can sit unused in the pool before being closed. */
  idleTimeout?: number;
}

/**
 * Connection parameters specifically for a MySQL database.
 */
export interface MySQLConnectionParams {
  /** The type of database, fixed to MySQL. */
  dbType: DbType.MySQL;
  /** Either a connection string (URL) or a configuration object. */
  connection: string | MySQLConnectionConfig;
}

/**
 * Detailed configuration for a MongoDB database connection.
 */
export interface MongoDbConnectionConfig {
  /** Full MongoDB connection URI. */
  uri: string;
  /** Maximum number of connections in the pool. */
  poolSize: number;
  /** Name of the target database. */
  database?: string;
  /** Whether to use TLS for the connection. */
  tls: boolean;
  /** Filename of the CA certificate under `db/.ca-certificates/`. */
  tlsCaFile?: string;
  /** Full path to the CA certificate file. */
  tlsCaPath?: string;
  /** Filename of the client certificate and key PEM file under `db/.ca-certificates/`. */
  tlsCertKeyFile?: string;
  /** Full path to the client certificate and key PEM file. */
  tlsCertKeyPath?: string;
  /** Password for the client certificate key file if it is encrypted. */
  tlsCertPassword?: string;
  /** Whether to allow invalid certificates for the connection. */
  tlsAllowInvalidCertificates?: boolean;
  /** Whether to allow invalid hostnames for the connection. */
  tlsAllowInvalidHostnames?: boolean;
}

/**
 * Connection parameters specifically for a MongoDB database.
 */
export interface MongoDbConnectionParams extends MongoDbConnectionConfig {
  /** The type of database, fixed to MongoDB. */
  dbType: DbType.MongoDB;
}

/**
 * Union type of all supported database connection parameters.
 * Initially supports only PostgreSQL.
 */
export type DbConnectionParams =
  | PostgresConnectionParams
  | SQLiteConnectionParams
  | MySQLConnectionParams
  | MongoDbConnectionParams;

export interface TableDDL {
  /** The physical database table name. */
  readonly tableName: string;
  create(transactionContext?: DbTransactionContext): MaybePromise<void>;
  drop(transactionContext?: DbTransactionContext): MaybePromise<void>;
  exists(transactionContext?: DbTransactionContext): MaybePromise<boolean>;
}

/**
 * Result of a batch insertion operation.
 */
/**
 * Result of an update operation.
 */
export interface DMLUpdateResult {
  /** The number of rows affected by the update. */
  affectedRows: number;
}

export interface DMLCreateManyResult {
  /** The number of rows successfully inserted. */
  insertedCount: number;
}

/**
 * Data Manipulation Layer interface for the mada adm config table.
 */
export interface MadaAdmConfigDML {
  /**
   * Retrieves the currently active MadaAdmConfig record.
   */
  get(): MaybePromise<MadaAdmConfig | null>;

  /**
   * Retrieves all MadaAdmConfig records.
   */
  getAll(): MaybePromise<MadaAdmConfig[]>;

  /**
   * Inserts a new MadaAdmConfig record.
   *
   * @param values - The configuration values.
   * @param isActive - Whether to set this record as active. Defaults to true.
   */
  insert(
    values: MadaAdmConfigValues,
    isActive?: boolean,
  ): MaybePromise<MadaAdmConfig>;

  /**
   * Updates an existing MadaAdmConfig record by its ID.
   *
   * @param id - The ID of the configuration to update.
   * @param values - The partial configuration values to update.
   */
  update(
    id: EntityId,
    values: Partial<MadaAdmConfigValues>,
  ): MaybePromise<MadaAdmConfig>;

  /**
   * Marks a specific configuration as active, and deactivates all others.
   *
   * @param id - The ID of the configuration to activate.
   */
  setActive(id: EntityId): MaybePromise<MadaAdmConfig>;

  /**
   * Deletes a MadaAdmConfig record by its ID.
   *
   * @param id - The ID of the configuration to delete.
   */
  delete(id: EntityId): MaybePromise<void>;

  /**
   * Creates or updates the Mada ADM configuration.
   *
   * @param values - The configuration values.
   */
  createOrUpdate(values: MadaAdmConfigValues): MaybePromise<MadaAdmConfig>;
}

/**
 * Base interface for ADM Data Manipulation Layer (DML) operations.
 */
export interface BaseAdmTableDML {
  /**
   * Removes duplicate records from the table based on specific administrative criteria.
   * Keeps only the record with the smallest ID for each unique set of keys.
   */
  deleteDuplicates(): MaybePromise<void>;
}

/**
 * Data Manipulation Layer interface for the provinces table.
 */
export interface ProvinceTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple provinces by their names.
   *
   * @param names - The province names to retrieve.
   * @returns An array of matching province entities.
   */
  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Province[]>;

  /**
   * Updates the province name of all province records whose IDs belong to the provided set.
   *
   * @param ids - The province IDs to target.
   * @param value - The new province name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode: AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;

  /**
   * Creates multiple province records.
   *
   * @param values - The province records to create.
   */
  createMany(values: ProvinceRecord[]): MaybePromise<DMLCreateManyResult>;

  /**
   * Updates the geojson field of a province record by its name.
   *
   * @param name - The name of the province.
   * @param geojson - The GeoJSON string value to assign.
   */
  updateGeojsonByName(
    name: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;
}

/**
 * Data Manipulation Layer interface for the regions table.
 */
export interface RegionTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple regions by their names.
   *
   * @param names - The region names to retrieve.
   * @returns An array of matching region entities.
   */
  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Region[]>;

  /**
   * Retrieves multiple regions whose nearest parent province ID is among the provided set.
   *
   * @param provinceIds - The province IDs to filter by.
   * @returns An array of matching region entities.
   */
  getManyByProvinceIds(
    provinceIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Region[]>;

  /**
   * Updates the region name of all region records whose IDs belong to the provided set.
   *
   * @param ids - The region IDs to target.
   * @param value - The new region name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode: AdmLevelCode.REGION | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;

  /**
   * Creates multiple region records.
   *
   * @param values - The region records to create.
   */
  createMany(values: RegionRecord[]): MaybePromise<DMLCreateManyResult>;

  /**
   * Updates the geojson field of a region record by its name.
   *
   * @param name - The name of the region.
   * @param geojson - The GeoJSON string value to assign.
   */
  updateGeojsonByName(
    name: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;
}

/**
 * Data Manipulation Layer interface for the districts table.
 */
export interface DistrictTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple districts by district names.
   *
   * @param districtNames - The list of district names.
   * @returns An array of matching district entities.
   */
  getManyByNames(
    districtNames: string[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<District[]>;

  /**
   * Retrieves multiple districts whose nearest parent region ID is among the provided set.
   *
   * @param regionIds - The region IDs to filter by.
   * @returns An array of matching district entities.
   */
  getManyByRegionIds(
    regionIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<District[]>;

  /**
   * Updates the district name of all district records whose IDs belong to the provided set.
   *
   * @param ids - The district IDs to target.
   * @param value - The new district name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;

  createMany(values: DistrictRecord[]): MaybePromise<DMLCreateManyResult>;

  /**
   * Updates the geojson field of a district record by district name.
   *
   * @param districtName - The district name.
   * @param geojson - The GeoJSON string value to assign.
   */
  updateGeojsonByName(
    districtName: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;
}

/**
 * Data Manipulation Layer interface for the communes table.
 */
export interface CommuneTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple communes by their unique attributes.
   *
   * @param attributes - The list of commune identifying attributes.
   * @returns An array of matching commune entities.
   */
  getManyByAttributes(
    attributes: CommuneAttributes[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Commune[]>;

  /**
   * Retrieves multiple communes whose nearest parent district ID is among the provided set.
   *
   * @param districtIds - The district IDs to filter by.
   * @returns An array of matching commune entities.
   */
  getManyByDistrictIds(
    districtIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Commune[]>;

  /**
   * Updates the commune name of all commune records whose IDs belong to the provided set.
   *
   * @param ids - The commune IDs to target.
   * @param value - The new commune name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.COMMUNE
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;

  /**
   * Creates multiple commune records.
   *
   * @param values - The commune records to create.
   */
  createMany(values: CommuneRecord[]): MaybePromise<DMLCreateManyResult>;

  /**
   * Updates the geojson field of a commune record by its identifying attributes.
   *
   * @param attributes - The identifying attributes for the commune.
   * @param geojson - The GeoJSON string value to assign.
   */
  updateGeojsonByAttributes(
    attributes: CommuneAttributes,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;
}

/**
 * Data Manipulation Layer interface for the fokontanys table.
 */
export interface FokontanyTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple fokontanys by their unique attributes.
   *
   * @param attributes - The list of fokontany identifying attributes.
   * @returns An array of matching fokontany entities.
   */
  getManyByAttributes(
    attributes: FokontanyAttributes[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Fokontany[]>;

  /**
   * Retrieves multiple fokontanys whose nearest parent commune ID is among the provided set.
   *
   * @param communeIds - The commune IDs to filter by.
   * @returns An array of matching fokontany entities.
   */
  getManyByCommuneIds(
    communeIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Fokontany[]>;

  /**
   * Updates the fokontany name of all fokontany records whose IDs belong to the provided set.
   *
   * @param ids - The fokontany IDs to target.
   * @param value - The new fokontany name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.FOKONTANY
      | AdmLevelCode.COMMUNE
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;

  /**
   * Creates multiple fokontany records.
   *
   * @param values - The fokontany records to create.
   */
  createMany(values: FokontanyRecord[]): MaybePromise<DMLCreateManyResult>;

  /**
   * Updates the geojson field of a fokontany record by its identifying attributes.
   *
   * @param attributes - The identifying attributes for the fokontany.
   * @param geojson - The GeoJSON string value to assign.
   */
  updateGeojsonByAttributes(
    attributes: FokontanyAttributes,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<DMLUpdateResult>;
}
