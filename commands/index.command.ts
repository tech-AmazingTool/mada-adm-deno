import * as path from "node:path";

import { TextLineStream } from "@std/streams";

import { ansi } from "@cliffy/ansi";
import { colors } from "@cliffy/ansi/colors";
import { Command } from "@cliffy/command";
import { Confirm, Select } from "@cliffy/prompt";

import {
  CLI_DESCRIPTION,
  CLI_NAME,
  CLI_VERSION,
  DB_TYPE_DESCRIPTION,
  DEBUG_DESCRIPTION,
  DISABLE_REDIS_DESCRIPTION,
  IN_MEMORY_INSERT_HWM_DESCRIPTION,
  IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
  MONGO_DATABASE_DESCRIPTION,
  MONGO_POOL_SIZE_DESCRIPTION,
  MONGO_TLS_ALLOW_INVALID_CERTIFICATES_DESCRIPTION,
  MONGO_TLS_ALLOW_INVALID_HOSTNAMES_DESCRIPTION,
  MONGO_TLS_CA_FILE_DESCRIPTION,
  MONGO_TLS_CA_PATH_DESCRIPTION,
  MONGO_TLS_CERT_KEY_FILE_DESCRIPTION,
  MONGO_TLS_CERT_KEY_PATH_DESCRIPTION,
  MONGO_TLS_CERT_PASSWORD_DESCRIPTION,
  MONGO_TLS_DESCRIPTION,
  MONGO_URI_DESCRIPTION,
  MYSQL_CA_CERT_FILE_DESCRIPTION,
  MYSQL_CA_CERT_PATH_DESCRIPTION,
  MYSQL_CERT_FILE_DESCRIPTION,
  MYSQL_CERT_PATH_DESCRIPTION,
  MYSQL_CONNECTION_LIMIT_DESCRIPTION,
  MYSQL_DATABASE_DESCRIPTION,
  MYSQL_HOST_DESCRIPTION,
  MYSQL_IDLE_TIMEOUT_DESCRIPTION,
  MYSQL_KEY_FILE_DESCRIPTION,
  MYSQL_KEY_PATH_DESCRIPTION,
  MYSQL_MAX_IDLE_DESCRIPTION,
  MYSQL_PASSWORD_DESCRIPTION,
  MYSQL_PORT_DESCRIPTION,
  MYSQL_SSL_DESCRIPTION,
  MYSQL_URL_DESCRIPTION,
  MYSQL_USER_DESCRIPTION,
  PG_CA_CERT_FILE_DESCRIPTION,
  PG_CA_CERT_PATH_DESCRIPTION,
  PG_CONNECTION_LIMIT_DESCRIPTION,
  PG_DATABASE_DESCRIPTION,
  PG_HOST_DESCRIPTION,
  PG_PASSWORD_DESCRIPTION,
  PG_PORT_DESCRIPTION,
  PG_SCHEMA_DESCRIPTION,
  PG_SSL_DESCRIPTION,
  PG_URL_DESCRIPTION,
  PG_USER_DESCRIPTION,
  PROCESSING_WORKERS_COUNT_DESCRIPTION,
  QUEUE_BATCH_SIZE_DESCRIPTION,
  QUEUE_MAX_RETRIES_DESCRIPTION,
  REDIS_CA_CERT_FILE_DESCRIPTION,
  REDIS_CA_CERT_PATH_DESCRIPTION,
  REDIS_CERT_FILE_DESCRIPTION,
  REDIS_CERT_PATH_DESCRIPTION,
  REDIS_DB_DESCRIPTION,
  REDIS_HOST_DESCRIPTION,
  REDIS_KEY_FILE_DESCRIPTION,
  REDIS_KEY_PATH_DESCRIPTION,
  REDIS_PASSWORD_DESCRIPTION,
  REDIS_PORT_DESCRIPTION,
  REDIS_SSL_DESCRIPTION,
  REDIS_URL_DESCRIPTION,
  REDIS_USERNAME_DESCRIPTION,
  SQLITE_DB_FILE_DESCRIPTION,
  SQLITE_DB_PATH_DESCRIPTION,
  WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
  WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
  XREAD_BLOCK_DURATION_DESCRIPTION,
} from "@scope/consts/cli";
import {
  DbType,
  DDL_TRANSACTION_OPTIONS,
  SQLITE_DB_DEFAULT_FILE,
  SQLITE_DB_DIR,
} from "@scope/consts/db";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  ADM_SEEDING_INPUT_FILENAMES_BY_CODE,
  ADM_SEEDING_INPUTS_DIR,
  AdmLevelCode,
} from "@scope/consts/models";
import {
  attemptDbConnection,
  injectCommunesDDL,
  injectCommunesDML,
  injectDbConnection,
  injectDistrictsDDL,
  injectDistrictsDML,
  injectFokontanysDDL,
  injectFokontanysDML,
  injectProvincesDDL,
  injectRegionsDDL,
  injectRegionsDML,
  resetCommunesDDL,
  resetDistrictsDDL,
  resetFokontanysDDL,
  resetProvincesDDL,
  resetRegionsDDL,
} from "@scope/db";
import { injectMadaAdmConfigDDL } from "@scope/db/ddl";
import { injectMadaAdmConfigDML, injectProvincesDML } from "@scope/db/dml";
import {
  displayMadaAdmConfig,
  promptMadaAdmConfig,
  resolveGlobalCliConfig,
  resolveIndexCliConfig,
} from "@scope/helpers/cli";
import {
  compareAdmValues,
  compareMadaAdmConfigValues,
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isProvinceValues,
  isRegionValues,
} from "@scope/helpers/models";
import { injectAdmIntegrationProgressRenderer } from "@scope/helpers/render-adm-integration-progress";
import { injectInMemoryQueueWorkersMediator } from "@scope/lib/in-memory-workers-mediators";
import {
  injectRedisQueueWorkersMediator,
  RedisQueueWorkersMediator,
} from "@scope/lib/redis-workers-mediators";
import type {
  QueueWorkersMediator,
  WorkerPool,
} from "@scope/lib/workers-mediators";
import {
  injectRedisConnection,
  type RedisConnection,
  type RedisConnectionParams,
} from "@scope/redis";
import type {
  GlobalCliConfig,
  GlobalCliConfigResolved,
  IndexActionCliConfigResolved,
} from "@scope/types/cli";
import type { SeedAdmJobContext } from "@scope/types/command";
import type { DbConnection, DbTransactionContext } from "@scope/types/db";
import type {
  AdmRecord,
  AdmValues,
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigValues,
} from "@scope/types/models";
import { DateUtils } from "@scope/utils";

const PROGRESS_BARS_LINES_COUNT = 5;

/**
 * Supported index action choices.
 */
type IndexAction = "resume" | "continue" | "change" | "abort";

/**
 * Supported change configuration action choices.
 */
type ChangeConfigAction = "create" | "update" | "switch";

/**
 * Supported post-input actions when confirmation, retry, or abort is requested.
 */
type PostInputAction = "continue" | "retry" | "abort";

/**
 * The root CLI command for the administrative data pipeline.
 * Responsible for parsing global database connection arguments,
 * merging CLI flags with environment variables, and initializing
 * the appropriate database adapter.
 */
export class CliIndexCommand extends Command<GlobalCliConfig, void> {
  /**
   * The database connection instance based on the database type and the database connection params.
   */
  #db!: DbConnection;

  private getAdmNameWithContext(m: AdmValues | AdmRecord): string {
    if (isFokontanyValues(m)) {
      return `${m.fokontany} (${m.commune}, ${m.district}, ${m.region}, ${m.province})`;
    } else if (isCommuneValues(m)) {
      return `${m.commune} (${m.district}, ${m.region}, ${m.province})`;
    } else if (isDistrictValues(m)) {
      return `${m.district} (${m.region}, ${m.province})`;
    } else if (isRegionValues(m)) {
      return `${m.region} (${m.province})`;
    } else if (isProvinceValues(m)) {
      return m.province;
    }
    return "unknown";
  }

  /**
   * Checks whether all ADM tables exist for the specified configuration.
   *
   * @param config - The Mada ADM configuration to check tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @returns True if all ADM tables exist, false otherwise.
   */
  private async checkAdmTablesExist(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
  ): Promise<boolean> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);

    const exists = (
      await Promise.all([
        provincesDDL.exists(),
        regionsDDL.exists(),
        districtsDDL.exists(),
        communesDDL.exists(),
        fokontanysDDL.exists(),
      ])
    ).every((e) => e);

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);

    return exists;
  }

  /**
   * Drops all ADM tables for the specified configuration in foreign key dependency order.
   *
   * @param config - The Mada ADM configuration to drop tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @param txCtx - Optional transaction context.
   */
  private async dropAdmTables(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
    txCtx?: DbTransactionContext,
  ): Promise<void> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);

    for (
      const ddl of [
        fokontanysDDL,
        communesDDL,
        districtsDDL,
        regionsDDL,
        provincesDDL,
      ]
    ) {
      console.log(`   Dropping the ${ddl.tableName} table ...`);
      await ddl.drop(txCtx);
    }

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);
  }

  /**
   * Creates all ADM tables for the specified configuration in parent-to-child order.
   *
   * @param config - The Mada ADM configuration to create tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @param txCtx - Optional transaction context.
   */
  private async createAdmTables(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
    txCtx?: DbTransactionContext,
  ): Promise<void> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);

    for (
      const ddl of [
        provincesDDL,
        regionsDDL,
        districtsDDL,
        communesDDL,
        fokontanysDDL,
      ]
    ) {
      console.log(`   Creating the ${ddl.tableName} table ...`);
      await ddl.create(txCtx);
    }

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);
  }

  /**
   * Initializes the root CLI command with global options and environment
   * variable mappings for database configuration.
   */
  constructor() {
    super();
    this.name(CLI_NAME)
      .version(CLI_VERSION)
      .description(CLI_DESCRIPTION)
      .throwErrors()
      // ── Global options ──────────────────────────────────────────────────
      .globalOption("--db-type <type:string>", DB_TYPE_DESCRIPTION)
      .globalOption("--cli-debug [debug:boolean]", DEBUG_DESCRIPTION)
      .group("PostgreSQL configuration")
      .globalOption("--pg.schema <schema:string>", PG_SCHEMA_DESCRIPTION)
      .globalOption("--pg.url <url:string>", PG_URL_DESCRIPTION)
      .globalOption("--pg.host <host:string>", PG_HOST_DESCRIPTION)
      .globalOption("--pg.port <port:number>", PG_PORT_DESCRIPTION)
      .globalOption("--pg.user <username:string>", PG_USER_DESCRIPTION)
      .globalOption(
        "--pg.password <password:string>",
        PG_PASSWORD_DESCRIPTION,
      )
      .globalOption(
        "--pg.database <database:string>",
        PG_DATABASE_DESCRIPTION,
      )
      .globalOption("--pg.ssl [ssl:boolean]", PG_SSL_DESCRIPTION)
      .globalOption(
        "--pg.ca-cert-file <filename:string>",
        PG_CA_CERT_FILE_DESCRIPTION,
      )
      .globalOption(
        "--pg.ca-cert-path <path:string>",
        PG_CA_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["--pg.ca-cert-file"],
        },
      )
      .globalOption(
        "--pg.connection-limit <limit:number>",
        PG_CONNECTION_LIMIT_DESCRIPTION,
      )
      .group("MySQL configuration")
      .globalOption("--mysql.url <url:string>", MYSQL_URL_DESCRIPTION)
      .globalOption("--mysql.host <host:string>", MYSQL_HOST_DESCRIPTION)
      .globalOption("--mysql.port <port:number>", MYSQL_PORT_DESCRIPTION)
      .globalOption("--mysql.user <username:string>", MYSQL_USER_DESCRIPTION)
      .globalOption(
        "--mysql.password <password:string>",
        MYSQL_PASSWORD_DESCRIPTION,
      )
      .globalOption(
        "--mysql.database <database:string>",
        MYSQL_DATABASE_DESCRIPTION,
      )
      .globalOption("--mysql.ssl [ssl:boolean]", MYSQL_SSL_DESCRIPTION)
      .globalOption(
        "--mysql.ca-cert-file <filename:string>",
        MYSQL_CA_CERT_FILE_DESCRIPTION,
      )
      .globalOption(
        "--mysql.ca-cert-path <path:string>",
        MYSQL_CA_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["--mysql.ca-cert-file"],
        },
      )
      .globalOption(
        "--mysql.cert-file <filename:string>",
        MYSQL_CERT_FILE_DESCRIPTION,
      )
      .globalOption(
        "--mysql.cert-path <path:string>",
        MYSQL_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["--mysql.cert-file"],
        },
      )
      .globalOption(
        "--mysql.key-file <filename:string>",
        MYSQL_KEY_FILE_DESCRIPTION,
      )
      .globalOption(
        "--mysql.key-path <path:string>",
        MYSQL_KEY_PATH_DESCRIPTION,
        {
          conflicts: ["--mysql.key-file"],
        },
      )
      .globalOption(
        "--mysql.connection-limit <limit:number>",
        MYSQL_CONNECTION_LIMIT_DESCRIPTION,
      )
      .globalOption(
        "--mysql.max-idle <max:number>",
        MYSQL_MAX_IDLE_DESCRIPTION,
      )
      .globalOption(
        "--mysql.idle-timeout <timeout:number>",
        MYSQL_IDLE_TIMEOUT_DESCRIPTION,
      )
      .group("SQLite configuration")
      .globalOption(
        "--sqlite.db-file <filename:string>",
        SQLITE_DB_FILE_DESCRIPTION,
      )
      .globalOption(
        "--sqlite.db-path <path:string>",
        SQLITE_DB_PATH_DESCRIPTION,
        {
          conflicts: ["sqlite.db-file"],
        },
      )
      .group("MongoDB configuration")
      .globalOption("--mongo.uri <uri:string>", MONGO_URI_DESCRIPTION)
      .globalOption(
        "--mongo.pool-size <limit:number>",
        MONGO_POOL_SIZE_DESCRIPTION,
      )
      .globalOption(
        "--mongo.database <database:string>",
        MONGO_DATABASE_DESCRIPTION,
      )
      .globalOption("--mongo.tls [tls:boolean]", MONGO_TLS_DESCRIPTION)
      .globalOption(
        "--mongo.tls-ca-file <filename:string>",
        MONGO_TLS_CA_FILE_DESCRIPTION,
      )
      .globalOption(
        "--mongo.tls-ca-path <path:string>",
        MONGO_TLS_CA_PATH_DESCRIPTION,
        {
          conflicts: ["--mongo.tls-ca-file"],
        },
      )
      .globalOption(
        "--mongo.tls-certificate-key-file <filename:string>",
        MONGO_TLS_CERT_KEY_FILE_DESCRIPTION,
      )
      .globalOption(
        "--mongo.tls-certificate-key-path <path:string>",
        MONGO_TLS_CERT_KEY_PATH_DESCRIPTION,
        {
          conflicts: ["--mongo.tls-certificate-key-file"],
        },
      )
      .globalOption(
        "--mongo.tls-certificate-key-file-password <password:string>",
        MONGO_TLS_CERT_PASSWORD_DESCRIPTION,
      )
      .globalOption(
        "--mongo.tls-allow-invalid-certificates [allow:boolean]",
        MONGO_TLS_ALLOW_INVALID_CERTIFICATES_DESCRIPTION,
      )
      .globalOption(
        "--mongo.tls-allow-invalid-hostnames [allow:boolean]",
        MONGO_TLS_ALLOW_INVALID_HOSTNAMES_DESCRIPTION,
      )
      // ── Global env variables ────────────────────────────────────────────
      .globalEnv("DB_TYPE=<type:string>", DB_TYPE_DESCRIPTION)
      .globalEnv("CLI_DEBUG=<debug:boolean>", DEBUG_DESCRIPTION)
      .globalEnv("PG_URL=<url:string>", PG_URL_DESCRIPTION)
      .globalEnv("PG_HOST=<host:string>", PG_HOST_DESCRIPTION)
      .globalEnv("PG_PORT=<port:number>", PG_PORT_DESCRIPTION)
      .globalEnv("PG_USER=<user:string>", PG_USER_DESCRIPTION)
      .globalEnv("PG_PASSWORD=<password:string>", PG_PASSWORD_DESCRIPTION)
      .globalEnv("PG_DATABASE=<database:string>", PG_DATABASE_DESCRIPTION)
      .globalEnv("PG_SCHEMA=<schema:string>", PG_SCHEMA_DESCRIPTION)
      .globalEnv("PG_SSL=<ssl:boolean>", PG_SSL_DESCRIPTION)
      .globalEnv(
        "PG_CA_CERT_FILE=<file:string>",
        PG_CA_CERT_FILE_DESCRIPTION,
      )
      .globalEnv(
        "PG_CA_CERT_PATH=<path:string>",
        PG_CA_CERT_PATH_DESCRIPTION,
      )
      .globalEnv(
        "PG_CONNECTION_LIMIT=<limit:number>",
        PG_CONNECTION_LIMIT_DESCRIPTION,
      )
      .globalEnv("MYSQL_URL=<url:string>", MYSQL_URL_DESCRIPTION)
      .globalEnv("MYSQL_HOST=<host:string>", MYSQL_HOST_DESCRIPTION)
      .globalEnv("MYSQL_PORT=<port:number>", MYSQL_PORT_DESCRIPTION)
      .globalEnv("MYSQL_USER=<user:string>", MYSQL_USER_DESCRIPTION)
      .globalEnv("MYSQL_PASSWORD=<password:string>", MYSQL_PASSWORD_DESCRIPTION)
      .globalEnv("MYSQL_DATABASE=<database:string>", MYSQL_DATABASE_DESCRIPTION)
      .globalEnv("MYSQL_SSL=<ssl:boolean>", MYSQL_SSL_DESCRIPTION)
      .globalEnv(
        "MYSQL_CA_CERT_FILE=<file:string>",
        MYSQL_CA_CERT_FILE_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_CA_CERT_PATH=<path:string>",
        MYSQL_CA_CERT_PATH_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_CERT_FILE=<file:string>",
        MYSQL_CERT_FILE_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_CERT_PATH=<path:string>",
        MYSQL_CERT_PATH_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_KEY_FILE=<file:string>",
        MYSQL_KEY_FILE_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_KEY_PATH=<path:string>",
        MYSQL_KEY_PATH_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_CONNECTION_LIMIT=<limit:number>",
        MYSQL_CONNECTION_LIMIT_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_MAX_IDLE=<max:number>",
        MYSQL_MAX_IDLE_DESCRIPTION,
      )
      .globalEnv(
        "MYSQL_IDLE_TIMEOUT=<timeout:number>",
        MYSQL_IDLE_TIMEOUT_DESCRIPTION,
      )
      .globalEnv("SQLITE_DB_FILE <filename:string>", SQLITE_DB_FILE_DESCRIPTION)
      .globalEnv("SQLITE_DB_PATH <path:string>", SQLITE_DB_PATH_DESCRIPTION)
      .globalEnv("MONGO_URI=<uri:string>", MONGO_URI_DESCRIPTION)
      .globalEnv(
        "MONGO_POOL_SIZE=<limit:number>",
        MONGO_POOL_SIZE_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_DATABASE=<database:string>",
        MONGO_DATABASE_DESCRIPTION,
      )
      .globalEnv("MONGO_TLS=<tls:boolean>", MONGO_TLS_DESCRIPTION)
      .globalEnv(
        "MONGO_TLS_CA_FILE=<file:string>",
        MONGO_TLS_CA_FILE_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_CA_PATH=<path:string>",
        MONGO_TLS_CA_PATH_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_CERT_KEY_FILE=<file:string>",
        MONGO_TLS_CERT_KEY_FILE_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_CERT_KEY_PATH=<path:string>",
        MONGO_TLS_CERT_KEY_PATH_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_CERT_PASSWORD=<password:string>",
        MONGO_TLS_CERT_PASSWORD_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_ALLOW_INVALID_CERTIFICATES=<allow:boolean>",
        MONGO_TLS_ALLOW_INVALID_CERTIFICATES_DESCRIPTION,
      )
      .globalEnv(
        "MONGO_TLS_ALLOW_INVALID_HOSTNAMES=<allow:boolean>",
        MONGO_TLS_ALLOW_INVALID_HOSTNAMES_DESCRIPTION,
      )
      .globalAction(async (args) => {
        await this.handleGlobalAction(resolveGlobalCliConfig(args));
      })
      // ── Command-scoped Redis options ────────────────────────────────────
      .group("Redis configuration")
      .option(
        "--disable-redis [disabled:boolean]",
        DISABLE_REDIS_DESCRIPTION,
      )
      .option("--redis.url <url:string>", REDIS_URL_DESCRIPTION)
      .option("--redis.host <host:string>", REDIS_HOST_DESCRIPTION)
      .option("--redis.port <port:number>", REDIS_PORT_DESCRIPTION)
      .option("--redis.user <username:string>", REDIS_USERNAME_DESCRIPTION)
      .option(
        "--redis.password <password:string>",
        REDIS_PASSWORD_DESCRIPTION,
      )
      .option("--redis.db <db:number>", REDIS_DB_DESCRIPTION)
      .option("--redis.ssl <ssl:boolean>", REDIS_SSL_DESCRIPTION)
      .option(
        "--redis.cert-file <filename:string>",
        REDIS_CERT_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option("--redis.cert-path <path:string>", REDIS_CERT_PATH_DESCRIPTION, {
        conflicts: ["redis.cert-file"],
        depends: ["redis.ssl"],
      })
      .option(
        "--redis.key-file <filename:string>",
        REDIS_KEY_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option("--redis.key-path <path:string>", REDIS_KEY_PATH_DESCRIPTION, {
        conflicts: ["redis.key-file"],
        depends: ["redis.ssl"],
      })
      .option(
        "--redis.ca-cert-file <filename:string>",
        REDIS_CA_CERT_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option(
        "--redis.ca-cert-path <path:string>",
        REDIS_CA_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["redis.ca-cert-file"],
          depends: ["redis.ssl"],
        },
      )
      // ── Command-scoped Redis env variables ──────────────────────────────
      .env("DISABLE_REDIS=<disabled:boolean>", DISABLE_REDIS_DESCRIPTION)
      .env("REDIS_URL=<url:string>", REDIS_URL_DESCRIPTION)
      .env("REDIS_HOST=<host:string>", REDIS_HOST_DESCRIPTION)
      .env("REDIS_PORT=<port:number>", REDIS_PORT_DESCRIPTION)
      .env("REDIS_USERNAME=<user:string>", REDIS_USERNAME_DESCRIPTION)
      .env("REDIS_PASSWORD=<password:string>", REDIS_PASSWORD_DESCRIPTION)
      .env("REDIS_DB=<db:number>", REDIS_DB_DESCRIPTION)
      .env("REDIS_SSL=<ssl:boolean>", REDIS_SSL_DESCRIPTION)
      .env("REDIS_CERT_FILE=<file:string>", REDIS_CERT_FILE_DESCRIPTION)
      .env("REDIS_CERT_PATH=<path:string>", REDIS_CERT_PATH_DESCRIPTION)
      .env("REDIS_KEY_FILE=<file:string>", REDIS_KEY_FILE_DESCRIPTION)
      .env("REDIS_KEY_PATH=<path:string>", REDIS_KEY_PATH_DESCRIPTION)
      .env(
        "REDIS_CA_CERT_FILE=<file:string>",
        REDIS_CA_CERT_FILE_DESCRIPTION,
      )
      .env(
        "REDIS_CA_CERT_PATH=<path:string>",
        REDIS_CA_CERT_PATH_DESCRIPTION,
      )
      // ── Command-scoped mediator/worker options ──────────────────────────
      .group("Mediator and worker configuration")
      .option(
        "--queue-batch-size <size:number>",
        QUEUE_BATCH_SIZE_DESCRIPTION,
      )
      .option(
        "--queue-max-retries <retries:number>",
        QUEUE_MAX_RETRIES_DESCRIPTION,
      )
      .option(
        "--in-memory-processing-hwm <hwm:number>",
        IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
      )
      .option(
        "--in-memory-insert-hwm <hwm:number>",
        IN_MEMORY_INSERT_HWM_DESCRIPTION,
      )
      .option(
        "--worker-healthcheck-interval <ms:number>",
        WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
      )
      .option(
        "--worker-pending-min-duration-threshold <ms:number>",
        WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
      )
      .option(
        "--xread-block-duration <ms:number>",
        XREAD_BLOCK_DURATION_DESCRIPTION,
      )
      .option(
        "--processing-workers-count <count:number>",
        PROCESSING_WORKERS_COUNT_DESCRIPTION,
      )
      // ── Command-scoped mediator/worker env variables ────────────────────
      .env("QUEUE_BATCH_SIZE=<size:number>", QUEUE_BATCH_SIZE_DESCRIPTION)
      .env(
        "QUEUE_MAX_RETRIES=<retries:number>",
        QUEUE_MAX_RETRIES_DESCRIPTION,
      )
      .env(
        "IN_MEMORY_PROCESSING_HWM=<hwm:number>",
        IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
      )
      .env(
        "IN_MEMORY_INSERT_HWM=<hwm:number>",
        IN_MEMORY_INSERT_HWM_DESCRIPTION,
      )
      .env(
        "WORKER_HEALTHCHECK_INTERVAL=<ms:number>",
        WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
      )
      .env(
        "WORKER_PENDING_MIN_DURATION_THRESHOLD=<ms:number>",
        WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
      )
      .env(
        "XREAD_BLOCK_DURATION=<ms:number>",
        XREAD_BLOCK_DURATION_DESCRIPTION,
      )
      .env(
        "PROCESSING_WORKERS_COUNT=<count:number>",
        PROCESSING_WORKERS_COUNT_DESCRIPTION,
      )
      .action(async (args) => {
        await this.handleIndexAction(resolveIndexCliConfig(args));
      });
  }

  /**
   * Internal handler executed when the global CLI command runs.
   * Instantiates and connects to the database based on the resolved configuration.
   *
   * @param args - The globally resolved CLI and environment configurations.
   */
  private async handleGlobalAction(args: GlobalCliConfigResolved) {
    console.log(
      colors.blue.bold(
        `🚀 Initializing Madagascar Administrative Boundaries (Mada ADM) CLI...\n`,
      ),
    );
    console.log(colors.gray(`   Database Type: ${args.dbType}`));
    switch (args.dbType) {
      case DbType.Postgres: {
        if (args.pg.url) {
          const maskedUrl = args.pg.url.replace(
            /^(postgres(?:ql)?:\/\/.*:)(.*)(@.*)$/,
            "$1****$3",
          );
          console.log(colors.gray(`   PostgreSQL URL: ${maskedUrl}`));
        } else {
          console.log(
            colors.gray(`   PostgreSQL Host: ${args.pg.host}:${args.pg.port}`),
          );
          console.log(colors.gray(`   PostgreSQL User: ${args.pg.user}`));
          console.log(colors.gray(`   Target Database: ${args.pg.database}`));
        }
        break;
      }
      case DbType.MySQL: {
        if (args.mysql.url) {
          const maskedUrl = args.mysql.url.replace(
            /^(mysql:\/\/.*:)(.*)(@.*)$/,
            "$1****$3",
          );
          console.log(colors.gray(`   MySQL URL: ${maskedUrl}`));
        } else {
          console.log(
            colors.gray(
              `   MySQL Host: ${args.mysql.host}:${args.mysql.port}`,
            ),
          );
          console.log(colors.gray(`   MySQL User: ${args.mysql.user}`));
          console.log(
            colors.gray(`   Target Database: ${args.mysql.database}`),
          );
        }
        break;
      }
      case DbType.SQLite: {
        let fullPath!: string;
        if (args.sqlite.dbFile) {
          fullPath = path.join(SQLITE_DB_DIR, args.sqlite.dbFile);
        } else if (args.sqlite.dbPath) {
          fullPath = path.resolve(args.sqlite.dbPath);
        } else {
          fullPath = path.join(SQLITE_DB_DIR, SQLITE_DB_DEFAULT_FILE);
        }
        console.log(colors.gray(`   SQLite DB File: ${fullPath}`));
        break;
      }
      case DbType.MongoDB: {
        const maskedUri = args.mongo.uri?.replace(
          /^(mongodb(?:\+srv)?:\/\/.*:)(.*)(@.*)$/,
          "$1****$3",
        );
        console.log(colors.gray(`   MongoDB URI: ${maskedUri}`));
        console.log(
          colors.gray(`   MongoDB Max Pool Size: ${args.mongo.poolSize}`),
        );
        if (args.mongo.database) {
          console.log(
            colors.gray(`   MongoDB Database: ${args.mongo.database}`),
          );
        }
        console.log(colors.gray(`   MongoDB TLS: ${args.mongo.tls}`));
        break;
      }
      default:
        break;
    }
    console.log();

    const db = await injectDbConnection(args.dbType);
    this.#db = db;

    console.log(colors.blue(`🔌 Establishing database connection...`));
    await attemptDbConnection(db, {
      dbType: args.dbType,
      pg: args.pg,
      mysql: args.mysql,
      sqlite: args.sqlite,
      mongo: args.mongo,
    });
    console.log(
      colors.green.bold(`✅ Database connection established successfully!\n`),
    );
  }

  /**
   * Internal handler executed when the index command action runs.
   * Resolves Redis configuration, connects if enabled, and initializes
   * the appropriate queue workers mediator (Redis-backed or in-memory).
   *
   * @param args - The resolved CLI and environment configurations.
   */
  private async handleIndexAction(args: IndexActionCliConfigResolved) {
    let redis: RedisConnection | null = null;

    try {
      const db = this.#db ?? (await injectDbConnection(args.dbType));
      const redisConfig = args.redis;
      const disableRedis = args.disableRedis;

      let mediator: QueueWorkersMediator<
        SeedAdmJobContext,
        AdmValues,
        AdmRecord,
        SeedAdmJobContext,
        AdmRecord
      >;

      if (!disableRedis) {
        redis = injectRedisConnection();
        console.log(colors.blue(`🔌 Establishing Redis connection...`));
        console.log(
          colors.gray(`   Redis Host: ${redisConfig.host}:${redisConfig.port}`),
        );

        const redisConnectionParams: RedisConnectionParams = redisConfig.url ||
          {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.user,
            password: redisConfig.password,
            db: redisConfig.db,
            ssl: redisConfig.ssl,
            certFile: redisConfig.certFile,
            certPath: redisConfig.certPath,
            keyFile: redisConfig.keyFile,
            keyPath: redisConfig.keyPath,
            caCertFile: redisConfig.caCertFile,
            caCertPath: redisConfig.caCertPath,
          };

        await redis.connect(
          redisConnectionParams,
        );
        console.log(
          colors.green.bold(`✅ Redis connection established successfully!\n`),
        );

        mediator = injectRedisQueueWorkersMediator<
          SeedAdmJobContext,
          AdmValues,
          AdmRecord,
          SeedAdmJobContext,
          AdmRecord
        >(
          redis.client,
          redisConnectionParams,
          {
            processingContextKey: "seed-adm:processing:context",
            processingStreamKey: "seed-adm:processing:stream",
            processingFailedIdsKey: "seed-adm:processing:failed-ids",
            insertContextKey: "seed-adm:insert:context",
            insertStreamKey: "seed-adm:insert:stream",
            insertFailedIdsKey: "seed-adm:insert:failed-ids",
            processingConsumerGroupName: "seed-adm:processing-group",
            insertConsumerGroupName: "seed-adm:insert-group",
            persistedLastMessageKey: "seed-adm:persisted-last:message",
            xreadBlockDuration: args.xreadBlockDuration,
            compareMessages: compareAdmValues,
            onRetryPendingPrompt: async () => {
              console.log(
                colors.yellow(
                  `⚠️  The processings or the insertions of some ADM territories were not completed. Do you want to retry those tasks?`,
                ),
              );
              const retry = await Confirm.prompt({
                message: "Retry?",
                default: true,
              });
              if (!retry) {
                Deno.exit(1);
              }
              return true;
            },
            debug: args.cliDebug,
          },
        );

        console.log(
          colors.green.bold(`✅ Redis Queue Workers Mediator initialized.\n`),
        );
      } else {
        console.log(
          colors.yellow(`ℹ️  Redis disabled. Using in-memory mediator.`),
        );

        mediator = injectInMemoryQueueWorkersMediator<
          SeedAdmJobContext,
          AdmValues,
          AdmRecord,
          SeedAdmJobContext,
          AdmRecord
        >({
          processingHwm: args.inMemoryProcessingHwm,
          insertHwm: args.inMemoryInsertHwm,
        });

        console.log(
          colors.green.bold(
            `✅ In-Memory Queue Workers Mediator initialized.\n`,
          ),
        );
      }

      const madaAdmConfigDDL = injectMadaAdmConfigDDL(args.dbType, db, {
        pgSchema: args.pgSchema,
      });
      const madaAdmConfigDML = await injectMadaAdmConfigDML(args.dbType, db, {
        pgSchema: args.pgSchema,
      });

      let action: IndexAction = "continue";
      let activeConfig: MadaAdmConfig | null = null;
      let prevJobContext: SeedAdmJobContext | null = null;

      do {
        activeConfig = null;
        const admConfigsTableExists = await madaAdmConfigDDL.exists();
        if (admConfigsTableExists) {
          activeConfig = await madaAdmConfigDML.get();
        } else {
          await madaAdmConfigDDL.create();
        }

        const existingConfigs = await madaAdmConfigDML.getAll();
        if (existingConfigs.length === 0) {
          console.log(
            colors.yellow(
              "ℹ️  No existing ADM configuration found in the database.\n",
            ),
          );
        } else {
          console.log(
            colors.blue(
              `Found ${existingConfigs.length} existing Mada ADM configuration(s):`,
            ),
          );
          console.log();
          for (let i = 0; i < existingConfigs.length; i++) {
            const num = i + 1;
            const isActiveSuffix = existingConfigs[i].isActive
              ? " (Active) "
              : " ";
            if (i > 0) {
              console.log();
            }
            displayMadaAdmConfig(
              `${num}.${isActiveSuffix}`,
              existingConfigs[i],
            );
          }
          console.log();
        }

        const admTablesExist = activeConfig
          ? await this.checkAdmTablesExist(
            activeConfig,
            args.dbType,
            db,
            args.pgSchema,
          )
          : null;

        prevJobContext = null;

        if (activeConfig) {
          if (!disableRedis && mediator instanceof RedisQueueWorkersMediator) {
            prevJobContext = ((await mediator.persistedContext) as
              | SeedAdmJobContext
              | null) ?? null;
          }

          if (prevJobContext) {
            console.log(
              colors.yellow("ℹ️  Previous job context found in Redis.\n"),
            );
            const configMatchesContext = activeConfig !== null &&
              compareMadaAdmConfigValues(prevJobContext.config, activeConfig);

            if (configMatchesContext) {
              console.log(
                colors.yellow(
                  "⚠️  An interrupted job matching the active configuration was found, and its ADM tables exist.\n",
                ),
              );
              action = (await Select.prompt({
                message: "Choose how to proceed with the job:",
                options: [
                  { name: "Resume the previous job", value: "resume" },
                  {
                    name:
                      "Restart fresh with the active configuration (drops tables)",
                    value: "continue",
                  },
                  { name: "Change the ADM configuration", value: "change" },
                ],
              })) as IndexAction;
            } else {
              console.log(
                colors.yellow(
                  "⚠️  The previous job's ADM configuration does not match the active ADM configuration.\n",
                ),
              );
              console.log(
                colors.yellow(
                  "⚠️  To resume, you must activate an ADM configuration that matches the previous job. Otherwise, you can continue by clearing the previous job context and starting fresh.\n",
                ),
              );
              action = (await Select.prompt({
                message: "Choose action:",
                options: [
                  {
                    name: "Start fresh with the active configuration",
                    value: "continue",
                  },
                  { name: "Change the ADM configuration", value: "change" },
                ],
              })) as IndexAction;
            }
          } else {
            action = (await Select.prompt({
              message: "Choose action:",
              options: [
                {
                  name: "Continue with the active configuration",
                  value: "continue",
                },
                { name: "Change the ADM configuration", value: "change" },
              ],
            })) as IndexAction;
          }
        } else {
          console.log(
            colors.red(
              "❌ No active ADM configuration found. Please create or activate a configuration first.",
            ),
          );
          action = "change";
        }
        console.log();

        // ── Branch on action ──────────────────────────────────────────────
        if (action === "continue" && admTablesExist) {
          console.log(
            colors.yellow(
              "⚠️  Continuing will drop the existing ADM tables for the active configuration and start seeding from scratch.\n",
            ),
          );
          const confirmed = await Confirm.prompt({
            message:
              "Are you sure you want to drop existing ADM tables and continue?",
            default: true,
          });
          console.log();
          if (!confirmed) {
            action = "abort";
          }
        }

        if (action === "change") {
          const nonActiveConfigs = existingConfigs.filter((c) => !c.isActive);
          const changeConfigOptions: Record<"name" | "value", string>[] = [
            { name: "Create a new configuration", value: "create" },
          ];
          if (existingConfigs.length > 0) {
            changeConfigOptions.push({
              name: "Update an existing configuration",
              value: "update",
            });
          }
          if (nonActiveConfigs.length > 0) {
            changeConfigOptions.push({
              name: "Switch active configuration",
              value: "switch",
            });
          }

          const changeConfigAction = (await Select.prompt({
            message: "Choose how to change the ADM configuration:",
            options: changeConfigOptions,
          })) as ChangeConfigAction;
          console.log();

          let newConfig: MadaAdmConfigValues | MadaAdmConfig | null = null;
          let postInputAction: PostInputAction = "continue";

          if (
            changeConfigAction === "create" ||
            changeConfigAction === "update"
          ) {
            let duplicateConfig: MadaAdmConfig | null = null;
            let updatedConfig: MadaAdmConfig | null = null;

            if (changeConfigAction === "update") {
              const configIdByChoice = new Map<number, EntityId>();
              for (let i = 0; i < existingConfigs.length; i++) {
                configIdByChoice.set(i + 1, existingConfigs[i].id);
              }
              const chosenStr = await Select.prompt({
                message: "Select configuration to update:",
                options: existingConfigs.map((_, i) => String(i + 1)),
              });
              const targetId = configIdByChoice.get(Number(chosenStr))!;
              updatedConfig = existingConfigs.find((c) => c.id === targetId)!;
              console.log();
            }

            while (true) {
              console.log(
                colors.yellow(
                  changeConfigAction === "create"
                    ? "ℹ️  Creating a new Mada ADM configuration:"
                    : `ℹ️  Updating configuration #${
                      existingConfigs.indexOf(updatedConfig!) + 1
                    }:`,
                ),
              );
              const promptResult = await promptMadaAdmConfig(
                updatedConfig ?? undefined,
              );
              const rawTablesPrefix = (promptResult.tablesPrefix as string) ??
                "";
              const tablesPrefix = rawTablesPrefix.trim() || null;
              console.log();

              newConfig = {
                tablesPrefix,
                isFkRepeated: promptResult.isFkRepeated as boolean,
                isProvinceRepeated: promptResult.isProvinceRepeated as boolean,
                isProvinceFkRepeated: promptResult
                  .isProvinceFkRepeated as boolean,
                hasGeojson: promptResult.hasGeojson as boolean,
                hasAdmLevel: promptResult.hasAdmLevel as boolean,
              };

              const isPrefixEqualAndDifferent = activeConfig !== null &&
                newConfig.tablesPrefix === activeConfig.tablesPrefix &&
                !compareMadaAdmConfigValues(newConfig, activeConfig);

              if (isPrefixEqualAndDifferent) {
                console.log(
                  colors.yellow(
                    "⚠️  The selected configuration uses the same table prefix as the active configuration. Continuing will drop the current ADM tables. Otherwise, retry with a different configuration or abort.\n",
                  ),
                );
                postInputAction = (await Select.prompt({
                  message: "Choose action:",
                  options: [
                    { name: "Continue", value: "continue" },
                    {
                      name: "Retry (input different settings)",
                      value: "retry",
                    },
                    { name: "Abort", value: "abort" },
                  ],
                })) as PostInputAction;
                console.log();
              } else {
                postInputAction = "continue";
              }

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "continue" && newConfig) {
              duplicateConfig = await madaAdmConfigDML.getExact(newConfig);

              await db.transaction(async (txCtx) => {
                let deactivateConfig = true;
                if (duplicateConfig) {
                  if (duplicateConfig.isActive) {
                    deactivateConfig = false;
                  }
                } else {
                  if (activeConfig === null) {
                    deactivateConfig = false;
                  }
                }

                if (deactivateConfig && activeConfig !== null) {
                  await madaAdmConfigDML.deactivate(activeConfig.id, txCtx);
                }

                if (duplicateConfig) {
                  if (!duplicateConfig.isActive) {
                    await madaAdmConfigDML.setActive(
                      duplicateConfig.id,
                      txCtx,
                    );
                  }
                  newConfig = duplicateConfig;
                } else {
                  if (changeConfigAction === "create") {
                    const inserted = await madaAdmConfigDML.insert(
                      newConfig as MadaAdmConfigValues,
                      true,
                      txCtx,
                    );
                    newConfig = inserted;
                  } else {
                    const updated = await madaAdmConfigDML.update(
                      updatedConfig!.id,
                      {
                        ...(newConfig as MadaAdmConfigValues),
                        isActive: true,
                      },
                      txCtx,
                    );
                    newConfig = updated;
                  }
                }
              });
            }
          } else if (changeConfigAction === "switch") {
            let switchedConfig!: MadaAdmConfig;

            while (true) {
              const currentNonActive = existingConfigs.filter(
                (c) => !c.isActive,
              );
              const chosenStr = await Select.prompt({
                message: "Select an ADM configuration to activate:",
                options: currentNonActive.map((c) => {
                  const num = existingConfigs.indexOf(c) + 1;
                  return {
                    name: `#${num} (Tables prefix: ${
                      c.tablesPrefix !== null ? `"${c.tablesPrefix}"` : "None"
                    })`,
                    value: String(num),
                  };
                }),
              });
              const selectedConfigId =
                currentNonActive[Number(chosenStr) - 1].id;
              switchedConfig = existingConfigs.find(
                (c) => c.id === selectedConfigId,
              )!;
              console.log();

              const isPrefixEqual = activeConfig !== null &&
                switchedConfig.tablesPrefix === activeConfig.tablesPrefix;

              if (isPrefixEqual) {
                console.log(
                  colors.yellow(
                    "⚠️  The selected configuration uses the same table prefix as the active configuration. Continuing will drop the current ADM tables. Otherwise, retry with a different configuration or abort.\n",
                  ),
                );
                postInputAction = (await Select.prompt({
                  message: "Choose action:",
                  options: [
                    { name: "Continue", value: "continue" },
                    {
                      name: "Retry (pick another configuration)",
                      value: "retry",
                    },
                    { name: "Abort", value: "abort" },
                  ],
                })) as PostInputAction;
                console.log();
              } else {
                postInputAction = "continue";
              }

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "continue") {
              await db.transaction(async (txCtx) => {
                if (activeConfig !== null) {
                  await madaAdmConfigDML.deactivate(activeConfig.id, txCtx);
                }
                await madaAdmConfigDML.setActive(switchedConfig.id, txCtx);
              });
              newConfig = switchedConfig;
            }
          }

          if (postInputAction === "abort") {
            action = "abort";
          } else if (
            postInputAction === "continue" &&
            newConfig !== null &&
            activeConfig !== null
          ) {
            const isConfigDifferent = !compareMadaAdmConfigValues(
              newConfig,
              activeConfig,
            );
            if (isConfigDifferent) {
              let dropAdmTables = true;
              if (newConfig.tablesPrefix !== activeConfig.tablesPrefix) {
                dropAdmTables = await Confirm.prompt({
                  message:
                    `Drop the ADM tables built with the previous active configuration (Tables prefix: ${
                      activeConfig.tablesPrefix
                        ? `"${activeConfig.tablesPrefix}"`
                        : "None"
                    })?`,
                  default: false,
                });
                console.log();
              }

              if (dropAdmTables) {
                console.log(
                  colors.yellow(
                    `🗑️ Dropping ADM tables with ${
                      activeConfig.tablesPrefix
                        ? `prefix as "${activeConfig.tablesPrefix}"`
                        : "no prefix"
                    }...`,
                  ),
                );
                const configToDrop = activeConfig;
                await db.transaction(async (txCtx) => {
                  await this.dropAdmTables(
                    configToDrop,
                    args.dbType,
                    db,
                    args.pgSchema,
                    txCtx,
                  );
                }, DDL_TRANSACTION_OPTIONS);
              }
            }
          }
        }
      } while (action === "change");

      if (action === "abort") {
        console.log(colors.gray("ℹ️  Pipeline execution cancelled.\n"));
        return;
      }

      if (action !== "resume") {
        if (activeConfig) {
          const tablesExist = await this.checkAdmTablesExist(
            activeConfig,
            args.dbType,
            db,
            args.pgSchema,
          );
          if (!tablesExist) {
            console.log(
              colors.yellow(
                `🏗️ Creating ADM tables with ${
                  activeConfig.tablesPrefix
                    ? `"${activeConfig.tablesPrefix}" prefix`
                    : "no prefix"
                } ...`,
              ),
            );
            await db.transaction(async (txCtx) => {
              await this.createAdmTables(
                activeConfig,
                args.dbType,
                db,
                args.pgSchema,
                txCtx,
              );
            }, DDL_TRANSACTION_OPTIONS);
          }
        }

        if (prevJobContext && mediator instanceof RedisQueueWorkersMediator) {
          console.log(
            colors.yellow("🧹 Clearing previous job context from Redis..."),
          );
          await mediator.clearPersisted();
          prevJobContext = null;
          console.log(
            colors.green.bold(
              "✅ Previous job context cleared successfully.\n",
            ),
          );
        }
      }

      const jobContext: SeedAdmJobContext =
        action === "resume" && prevJobContext ? prevJobContext : {
          config: activeConfig!,
          currentAdmLevel: AdmLevelCode.PROVINCE,
          dbConnectionParams: this.#db.params,
          jobTimestamp: Date.now(),
          ddlExtraOptions: {
            pgSchema: args.pgSchema,
          },
          dbType: args.dbType,
          progressBarsLinesCount: PROGRESS_BARS_LINES_COUNT,
        };

      const initialAdmLevelIndex = ADM_LEVEL_INDEX_BY_CODE.get(
        jobContext.currentAdmLevel,
      )!;

      const startTime = Date.now();
      const progressRenderer = !args.cliDebug
        ? injectAdmIntegrationProgressRenderer()
        : null;

      let processingCounter = 0;
      let insertCounter = 0;

      try {
        for (
          let i = initialAdmLevelIndex;
          i < ADM_LEVEL_CODES_INDEXED.length;
          i++
        ) {
          const admLevelCode = ADM_LEVEL_CODES_INDEXED[i];
          const levelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;

          const admDataTotalCount = ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(
            admLevelCode,
          )!;
          processingCounter = 0;
          insertCounter = 0;

          console.log(
            colors.rgb8(
              `ADM level: ${levelTitle} (${admDataTotalCount} entries)\n`,
              0x27be8c,
            ),
          );

          jobContext.currentAdmLevel = admLevelCode;
          if (args.cliDebug) {
            console.log(
              colors.cyan("Current job context:\n"),
              JSON.stringify(jobContext, null, 2),
            );
            console.log();
          }

          const inputFilePathItems: string[] = [];
          if (import.meta.dirname) {
            inputFilePathItems.push(import.meta.dirname, "../");
          } else {
            inputFilePathItems.push(Deno.cwd());
          }
          inputFilePathItems.push(
            ADM_SEEDING_INPUTS_DIR,
            ADM_SEEDING_INPUT_FILENAMES_BY_CODE.get(admLevelCode)!,
          );
          const inputFilePath = path.join(...inputFilePathItems);
          const inputReadableStream: ReadableStream<AdmValues> =
            (await Deno.open(inputFilePath))
              .readable
              .pipeThrough(new TextDecoderStream())
              .pipeThrough(new TextLineStream())
              .pipeThrough(
                new TransformStream<string, AdmValues>({
                  transform(chunk, controller) {
                    const admValues = JSON.parse(chunk.trim()) as AdmValues;
                    controller.enqueue(admValues);
                  },
                }),
              );

          const disableRedisUrlSearch = `disable-redis=${args.disableRedis}`;
          const processingWorkerURL = new URL(
            "./workers/index.command.processing.worker.ts",
            import.meta.url,
          );
          processingWorkerURL.search = disableRedisUrlSearch;
          const processingWorkers = [...Array(args.processingWorkersCount)].map(
            () =>
              new Worker(
                processingWorkerURL,
                { type: "module" },
              ),
          );
          const insertWorkerURL = new URL(
            "./workers/index.command.insert.worker.ts",
            import.meta.url,
          );
          insertWorkerURL.search = disableRedisUrlSearch;
          const insertWorker = new Worker(
            insertWorkerURL,
            { type: "module" },
          );
          const workers: WorkerPool = {
            processing: processingWorkers,
            insert: insertWorker,
          };

          const mediatorContext: Parameters<typeof mediator.queue>[0] = {
            processing: jobContext,
            insert: jobContext,
          };

          progressRenderer?.start(admLevelCode);

          await mediator.queue(mediatorContext, inputReadableStream, workers, {
            debug: args.cliDebug,
            batchSize: args.queueBatchSize,
            totalCount: ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(admLevelCode)!,
            maxRetries: args.queueMaxRetries,
            onProcessingFinished: (payloads: AdmRecord[]) => {
              if (progressRenderer) {
                const lines = payloads.map((payload) => {
                  const name = this.getAdmNameWithContext(payload);
                  return `✅ Processed ${levelTitle}: ${name}`;
                });
                progressRenderer.updateLogs(lines);
              } else {
                for (const payload of payloads) {
                  const name = this.getAdmNameWithContext(payload);
                  console.log(
                    ansi.cursorLeft +
                      `✅ Processed ${levelTitle}: ${name}`,
                  );
                }
              }
              processingCounter += payloads.length;
            },
            onProcessingProgress: ({ progress, current, total }) => {
              if (progressRenderer) {
                progressRenderer.updateProgressBar("processing", current);
              } else {
                console.log(
                  `📈 Progress [PROCESSING] : ${current.toLocaleString()} / ${total.toLocaleString()} (${
                    Number((progress * 100).toFixed(1))
                  }%)`,
                );
              }
            },
            onProcessingLog: (lines) => {
              if (progressRenderer) {
                progressRenderer.updateLogs(lines);
              } else {
                console.log(lines.join("\n"));
              }
            },
            onInsertFinished: (payloads: AdmRecord[]) => {
              if (progressRenderer) {
                const lines = payloads.map((payload) => {
                  const name = this.getAdmNameWithContext(payload);
                  return `💾 Inserted ${levelTitle}: ${name}`;
                });
                progressRenderer.updateLogs(lines);
              } else {
                for (const payload of payloads) {
                  const name = this.getAdmNameWithContext(payload);
                  console.log(
                    ansi.cursorLeft +
                      `💾 Inserted ${levelTitle}: ${name}`,
                  );
                }
              }
              insertCounter += payloads.length;
            },
            onInsertProgress: ({ current, total, progress }) => {
              if (progressRenderer) {
                progressRenderer.updateProgressBar("insert", current);
              } else {
                console.log(
                  `📈 Progress [INSERT] : ${current.toLocaleString()} / ${total.toLocaleString()} (${
                    Number((progress * 100).toFixed(1))
                  }%)`,
                );
              }
            },
            onInsertLog: (lines) => {
              if (progressRenderer) {
                progressRenderer.updateLogs(lines);
              } else {
                console.log(lines.join("\n"));
              }
            },
          });

          progressRenderer?.stop();

          console.log(`🧹 Deleting duplicates for ${levelTitle}...`);
          const dmlArgs = [jobContext.config, args.dbType, this.#db, {
            pgSchema: args.pgSchema,
          }] as const;
          const tableDML = admLevelCode === AdmLevelCode.PROVINCE
            ? injectProvincesDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.REGION
            ? injectRegionsDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.DISTRICT
            ? injectDistrictsDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.COMMUNE
            ? injectCommunesDML(...dmlArgs)
            : injectFokontanysDML(...dmlArgs);

          await tableDML.deleteDuplicates();
          console.log(
            colors.green(`✅ Duplicates removed for ${levelTitle}.\n`),
          );

          // Cleanup for this level
          for (const w of processingWorkers) w.terminate();
          insertWorker?.terminate();
          if (mediator instanceof RedisQueueWorkersMediator) {
            await mediator.clearPersisted();
          }
        }

        console.log(
          colors.green(
            "🏁 Mada ADM data seeding process completed successfully.\n",
          ),
        );
      } catch (error) {
        progressRenderer?.stop();
        console.error(`❌ Fatal Error: ${(error as Error).message}\n`);
      } finally {
        progressRenderer?.stop();
        const totalDurationMs = Date.now() - startTime;
        console.log(
          `⏱️  Total duration: ${DateUtils.formatDuration(totalDurationMs)}\n`,
        );
      }
    } catch (error) {
      console.error(`❌ Fatal Error: ${(error as Error).message}\n`);
    } finally {
      if (redis) {
        redis.close();
        console.log(
          colors.gray("🔌 Redis connection closed successfully...\n"),
        );
      }
      await this.#db.close();
      console.log(
        colors.gray("🔌 Database connection closed successfully...\n"),
      );
    }
  }
}

let _cliIndexCommand!: CliIndexCommand;

/**
 * Injects and manages a singleton instance of the CliIndexCommand.
 *
 * @returns The singleton instance of the CLI root command.
 */
export function injectCliIndexCommand(): CliIndexCommand {
  if (!_cliIndexCommand) {
    _cliIndexCommand = new CliIndexCommand();
  }
  return _cliIndexCommand;
}
