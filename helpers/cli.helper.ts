import { colors } from "@cliffy/ansi/colors";
import { Confirm, Input, prompt } from "@cliffy/prompt";
import { Table } from "@cliffy/table";

import {
  type DbType,
  DEFAULT_DB_TYPE,
  DEFAULT_PG_SCHEMA,
} from "@scope/consts/db";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_WORKER_JOB_HWM,
} from "@scope/lib/in-memory-workers-mediators";
import {
  DEFAULT_XREAD_BLOCK_DURATION,
} from "@scope/lib/redis-workers-mediators";
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_PROCESSING_WORKERS_COUNT,
} from "@scope/lib/workers-mediators";
import type {
  GlobalCliConfig,
  GlobalCliConfigResolved,
  IndexActionCliConfig,
  IndexActionCliConfigResolved,
} from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";

/**
 * Resolves the raw global CLI configuration into a fully-typed, default-applied
 * resolved configuration.
 *
 * Resolution priority for each field: CLI flag → env-var shadow key → hardcoded default.
 *
 * @param args - The raw global CLI config as populated by Cliffy.
 * @returns A fully resolved global CLI configuration with no `undefined` values for
 *   defaulted fields.
 */
export function resolveCommonGlobalCliConfig(args: GlobalCliConfig): {
  dbType: DbType;
  pgSchema: string;
} {
  return {
    dbType: (args.dbType ?? DEFAULT_DB_TYPE) as DbType,
    pgSchema: args.pg?.schema ?? args.pgSchema ?? DEFAULT_PG_SCHEMA,
  };
}

/**
 * Resolves the raw global CLI configuration into a fully-typed, default-applied
 * resolved configuration.
 */
export function resolveGlobalCliConfig(
  args: GlobalCliConfig,
): GlobalCliConfigResolved {
  const common = resolveCommonGlobalCliConfig(args);
  return {
    dbType: common.dbType,
    cliDebug: !!(args.cliDebug ?? false),
    pgSchema: common.pgSchema,
    pg: {
      url: args.pg?.url ?? args.pgUrl,
      host: args.pg?.host ?? args.pgHost ?? "localhost",
      port: args.pg?.port ?? args.pgPort ?? 5432,
      user: args.pg?.user ?? args.pgUser ?? "postgres",
      password: args.pg?.password ?? args.pgPassword ?? "",
      database: args.pg?.database ?? args.pgDatabase ?? "postgres",
      ssl: args.pg?.ssl ?? args.pgSsl ?? false,
      caCertFile: args.pg?.caCertFile ?? args.pgCaCertFile,
      caCertPath: args.pg?.caCertPath ?? args.pgCaCertPath,
      connectionLimit: args.pg?.connectionLimit ?? args.pgConnectionLimit ?? 10,
    },
    mysql: {
      url: args.mysql?.url ?? args.mysqlUrl,
      host: args.mysql?.host ?? args.mysqlHost ?? "localhost",
      port: args.mysql?.port ?? args.mysqlPort ?? 3306,
      user: args.mysql?.user ?? args.mysqlUser ?? "root",
      password: args.mysql?.password ?? args.mysqlPassword ?? "",
      database: args.mysql?.database ?? args.mysqlDatabase,
      ssl: args.mysql?.ssl ?? args.mysqlSsl ?? false,
      caCertFile: args.mysql?.caCertFile ?? args.mysqlCaCertFile,
      caCertPath: args.mysql?.caCertPath ?? args.mysqlCaCertPath,
      certFile: args.mysql?.certFile ?? args.mysqlCertFile,
      certPath: args.mysql?.certPath ?? args.mysqlCertPath,
      keyFile: args.mysql?.keyFile ?? args.mysqlKeyFile,
      keyPath: args.mysql?.keyPath ?? args.mysqlKeyPath,
      connectionLimit: args.mysql?.connectionLimit ??
        args.mysqlConnectionLimit ??
        10,
      maxIdle: args.mysql?.maxIdle ?? args.mysqlMaxIdle,
      idleTimeout: args.mysql?.idleTimeout ?? args.mysqlIdleTimeout,
    },
    sqlite: {
      dbFile: args.sqlite?.dbFile ?? args.sqliteDbFile,
      dbPath: args.sqlite?.dbPath ?? args.sqliteDbPath,
    },
    mongo: {
      uri: args.mongo?.uri ?? args.mongoUri ?? "mongodb://localhost:27017",
      poolSize: args.mongo?.poolSize ?? args.mongoPoolSize ?? 10,
      database: args.mongo?.database ?? args.mongoDatabase,
      tls: args.mongo?.tls ?? args.mongoTls ?? false,
      tlsCaFile: args.mongo?.tlsCaFile ?? args.mongoTlsCaFile,
      tlsCaPath: args.mongo?.tlsCaPath ?? args.mongoTlsCaPath,
      tlsCertKeyFile: args.mongo?.tlsCertKeyFile ?? args.mongoTlsCertKeyFile,
      tlsCertKeyPath: args.mongo?.tlsCertKeyPath ?? args.mongoTlsCertKeyPath,
      tlsCertPassword: args.mongo?.tlsCertPassword ?? args.mongoTlsCertPassword,
      tlsAllowInvalidCertificates: args.mongo?.tlsAllowInvalidCertificates ??
        args.mongoTlsAllowInvalidCertificates ??
        false,
      tlsAllowInvalidHostnames: args.mongo?.tlsAllowInvalidHostnames ??
        args.mongoTlsAllowInvalidHostnames ??
        false,
    },
  };
}

/**
 * Resolves the raw index-action CLI configuration into a fully-typed,
 * default-applied resolved configuration.
 *
 * Resolution priority for each field: CLI flag → env-var shadow key → hardcoded default.
 * The full `pg` block is not carried over — only `pgSchema` is preserved, since
 * the database connection was already established by the global action handler.
 *
 * @param args - The raw index-action CLI config as populated by Cliffy.
 * @returns A fully resolved index-action CLI configuration with no `undefined`
 *   values for defaulted fields.
 */
export function resolveIndexCliConfig(
  args: IndexActionCliConfig,
): IndexActionCliConfigResolved {
  const global = resolveGlobalCliConfig(args);
  return {
    dbType: global.dbType,
    cliDebug: global.cliDebug,
    pgSchema: global.pgSchema,
    disableRedis: !!(args.disableRedis ?? false),
    redis: {
      url: args.redis?.url ?? args.redisUrl,
      host: args.redis?.host ?? args.redisHost ?? "localhost",
      port: args.redis?.port ?? args.redisPort ?? 6379,
      user: args.redis?.user ?? args.redisUsername,
      password: args.redis?.password ?? args.redisPassword,
      db: args.redis?.db ?? args.redisDb,
      ssl: args.redis?.ssl ?? args.redisSsl ?? false,
      certFile: args.redis?.certFile ?? args.redisCertFile,
      certPath: args.redis?.certPath ?? args.redisCertPath,
      keyFile: args.redis?.keyFile ?? args.redisKeyFile,
      keyPath: args.redis?.keyPath ?? args.redisKeyPath,
      caCertFile: args.redis?.caCertFile ?? args.redisCaCertFile,
      caCertPath: args.redis?.caCertPath ?? args.redisCaCertPath,
    },
    queueBatchSize: args.queueBatchSize ?? DEFAULT_BATCH_SIZE,
    queueMaxRetries: args.queueMaxRetries ?? DEFAULT_MAX_RETRIES,
    inMemoryProcessingHwm: args.inMemoryProcessingHwm ?? DEFAULT_WORKER_JOB_HWM,
    inMemoryInsertHwm: args.inMemoryInsertHwm ?? DEFAULT_WORKER_JOB_HWM,
    xreadBlockDuration: args.xreadBlockDuration ?? DEFAULT_XREAD_BLOCK_DURATION,
    processingWorkersCount: args.processingWorkersCount ??
      DEFAULT_PROCESSING_WORKERS_COUNT,
  };
}

/**
 * Prints the Mada ADM configuration in a human-readable table.
 *
 * @param title - The section title to display above the table.
 * @param values - The configuration values to render.
 */
export function displayMadaAdmConfig(
  title: string,
  values: MadaAdmConfigValues,
): void {
  const table = new Table(
    [
      "Tables prefix",
      values.tablesPrefix
        ? colors.green(values.tablesPrefix)
        : colors.gray("None"),
    ],
    [
      "Parent tables' foreign keys are repeated",
      values.isFkRepeated ? colors.green("Yes") : colors.red("No"),
    ],
    [
      "A parent province's name is repeated across sub-tables",
      values.isProvinceRepeated ? colors.green("Yes") : colors.red("No"),
    ],
    [
      "A parent province's foreign key is repeated across sub-tables",
      values.isProvinceFkRepeated ? colors.green("Yes") : colors.red("No"),
    ],
    [
      "A table stores the spatial GeoJSON boundaries of its corresponding ADM",
      values.hasGeojson ? colors.green("Yes") : colors.red("No"),
    ],
    [
      "A table stores its ADM level index (0 to 4)",
      values.hasAdmLevel ? colors.green("Yes") : colors.red("No"),
    ],
  );
  console.log(colors.blue(`\n⚙️  ${title}:`));
  console.log(table.toString());
}

/**
 * Prompts the user to define or update the Mada ADM configuration interactively.
 *
 * @param prevValues - Optional previous configuration values to use as defaults.
 * @returns A promise that resolves to the new Mada ADM configuration values.
 */
export async function promptMadaAdmConfig(
  prevValues?: Partial<MadaAdmConfigValues>,
): Promise<MadaAdmConfigValues> {
  const result = await prompt([
    {
      name: "tablesPrefix",
      message: "Tables Prefix (leave empty for none):",
      type: Input,
      default: prevValues?.tablesPrefix ?? "",
    },
    {
      name: "isFkRepeated",
      message: "Are parent tables's foreign keys repeated?",
      type: Confirm,
      default: prevValues?.isFkRepeated ?? true,
    },
    {
      name: "isProvinceRepeated",
      message: "Is a parent province's name repeated across sub-tables?",
      type: Confirm,
      default: prevValues?.isProvinceRepeated ?? false,
    },
    {
      name: "isProvinceFkRepeated",
      message: "Is a parent province's foreign key repeated across sub-tables?",
      type: Confirm,
      default: prevValues?.isProvinceFkRepeated ?? false,
    },
    {
      name: "hasGeojson",
      message:
        "Do tables include the spatial geometries of their respective ADM boundaries?",
      type: Confirm,
      default: prevValues?.hasGeojson ?? false,
    },
    {
      name: "hasAdmLevel",
      message: "Do the tables include an adm level index (0 to 4) column?",
      type: Confirm,
      default: prevValues?.hasAdmLevel ?? true,
    },
  ]);

  return result as MadaAdmConfigValues;
}
