import { parseArgs } from "@std/cli";
import * as path from "@std/path";
import { TextLineStream } from "@std/streams";

import {
  injectCommunesPostgresDDL,
  injectCommunesPostgresDML,
  injectDistrictsPostgresDDL,
  injectDistrictsPostgresDML,
  injectFokontanysPostgresDDL,
  injectPostgresDbConnection,
  injectProvincesPostgresDDL,
  injectProvincesPostgresDML,
  injectRegionsPostgresDDL,
  injectRegionsPostgresDML,
} from "@scope/adapters/postgres";
import { DbType } from "@scope/consts/db";
import {
  ADM_GEOJSON_FILES_PATHS,
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  ADM_SEEDING_INPUT_FILENAMES_BY_CODE,
  ADM_SEEDING_INPUTS_GENERATED_DIR,
  AdmLevelCode,
} from "@scope/consts/models";
import { CliArgsEnvResolvers } from "@scope/helpers";
import {
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isRegionValues,
  mapAdmRecordToValues,
} from "@scope/helpers/models";
import {
  InMemory,
  type QueueWorkersMediator,
  Redis,
} from "@scope/lib/workers-mediators";
import { injectRedisConnection } from "@scope/redis";
import type {
  PostgresDbConnectionCliConfig,
  RedisDbConnectionCliConfig,
} from "@scope/types/cli";
import type {
  PostgresConnectionConfig,
  PostgresConnectionParams,
  TableDDL,
} from "@scope/types/db";
import type {
  AdmRecord,
  AdmValuesDiscriminated,
  MadaAdmConfigValues,
  ProvinceValues,
} from "@scope/types/models";
import type { GeoJSONFeature } from "@scope/types/utils";

import type { ExtractAdmInputJobContext } from "./extract-adm-input.d.ts";
import { RedisQueueWorkersMediator } from "@scope/lib/redis-workers-mediators";

type Feature = GeoJSONFeature<{
  shapeName: string;
  shapeID: string;
  shapeType: string;
}>;

/**
 * Parsed CLI arguments for the worker mediators configuration.
 */
interface MediatorCliArgs {
  queueBatchSize?: number;
  queueMaxRetries?: number;
  inMemoryProcessingHwm?: number;
  inMemoryInsertHwm?: number;
  workerHealthcheckInterval?: number;
  workerPendingMinDurationThreshold?: number;
  processingWorkersCount?: number;
  debug?: boolean;
}

const args = parseArgs(Deno.args, {
  string: [
    "pg.url",
    "pg.host",
    "pg.port",
    "pg.user",
    "pg.password",
    "pg.database",
    "pg.schema",
    "pg.ca-cert-file",
    "pg.ca-cert-path",
    "redis.url",
    "redis.host",
    "redis.port",
    "redis.user",
    "redis.password",
    "redis.db",
    "queue-batch-size",
    "queue-max-retries",
    "in-memory-processing-hwm",
    "in-memory-insert-hwm",
    "processing-workers-count",
  ],
  boolean: ["pg.ssl", "disable-redis", "redis.ssl", "debug"],
  default: {},
});

// 1. Resolve PostgreSQL Parameters
const pgParams: PostgresDbConnectionCliConfig = {
  url: CliArgsEnvResolvers.resolveOptionalString(args["pg"].url, "PG_URL"),
  host: CliArgsEnvResolvers.resolveString(
    args["pg"].host,
    "PG_HOST",
    "localhost",
  ),
  port: CliArgsEnvResolvers.resolveNumber(
    args["pg"].port as number | undefined,
    "PG_PORT",
    5432,
  ),
  user: CliArgsEnvResolvers.resolveString(
    args["pg"].user,
    "PG_USER",
    "postgres",
  ),
  password: CliArgsEnvResolvers.resolveString(
    args["pg"].password,
    "PG_PASSWORD",
    "",
  ),
  database: CliArgsEnvResolvers.resolveString(
    args["pg"].database,
    "PG_DATABASE",
    "postgres",
  ),
  schema: CliArgsEnvResolvers.resolveString(
    args["pg"].schema,
    "PG_SCHEMA",
    "public",
  ),
  ssl: CliArgsEnvResolvers.resolveBoolean(
    args["pg"].ssl as boolean | undefined,
    "PG_SSL",
  ) ?? false,
  caCertFile: CliArgsEnvResolvers.resolveOptionalString(
    args["pg"]["ca-cert-file"] as string | undefined,
    "PG_CA_CERT_FILE",
  ),
  caCertPath: CliArgsEnvResolvers.resolveOptionalString(
    args["pg"]["ca-cert-path"] as string | undefined,
    "PG_CA_CERT_PATH",
  ),
};

const disableRedis = !!CliArgsEnvResolvers.resolveBoolean(
  args["disable-redis"] as boolean | undefined,
  "DISABLE_REDIS",
);

// 2. Resolve Redis Parameters
const redisCliArgs: RedisDbConnectionCliConfig = {
  url: CliArgsEnvResolvers.resolveOptionalString(
    args["redis"].url,
    "REDIS_URL",
  ),
  host: CliArgsEnvResolvers.resolveString(
    args["redis"].host,
    "REDIS_HOST",
    "localhost",
  ),
  port: CliArgsEnvResolvers.resolveNumber(
    args["redis"].port as number | undefined,
    "REDIS_PORT",
    6379,
  ),
  user: CliArgsEnvResolvers.resolveOptionalString(
    args["redis"].user,
    "REDIS_USER",
  ),
  password: CliArgsEnvResolvers.resolveOptionalString(
    args["redis"].password,
    "REDIS_PASSWORD",
  ),
  db: CliArgsEnvResolvers.resolveNumber(
    args["redis"].db as number | undefined,
    "REDIS_DB",
    0,
  ),
  ssl: !!CliArgsEnvResolvers.resolveBoolean(
    args["redis"].ssl as boolean | undefined,
    "REDIS_SSL",
  ),
};

// 3. Resolve Mediator Parameters
const mediatorCliArgs: MediatorCliArgs = {
  queueBatchSize: CliArgsEnvResolvers.resolveOptionalNumber(
    args["queue-batch-size"] as number | undefined,
    "QUEUE_BATCH_SIZE",
  ),
  queueMaxRetries: CliArgsEnvResolvers.resolveOptionalNumber(
    args["queue-max-retries"] as number | undefined,
    "QUEUE_MAX_RETRIES",
  ),
  inMemoryProcessingHwm: CliArgsEnvResolvers.resolveOptionalNumber(
    args["in-memory-processing-hwm"] as number | undefined,
    "IN_MEMORY_PROCESSING_HWM",
  ),
  inMemoryInsertHwm: CliArgsEnvResolvers.resolveOptionalNumber(
    args["in-memory-insert-hwm"] as number | undefined,
    "IN_MEMORY_INSERT_HWM",
  ),
  workerHealthcheckInterval: CliArgsEnvResolvers.resolveOptionalNumber(
    args["worker-healthcheck-interval"] as number | undefined,
    "WORKER_HEALTHCHECK_INTERVAL",
  ),
  workerPendingMinDurationThreshold: CliArgsEnvResolvers.resolveOptionalNumber(
    args["worker-pending-min-duration-threshold"] as number | undefined,
    "WORKER_PENDING_MIN_DURATION_THRESHOLD",
  ),
  processingWorkersCount: CliArgsEnvResolvers.resolveNumber(
    args["processing-workers-count"] as number | undefined,
    "PROCESSING_WORKERS_COUNT",
    5,
  ),
  debug: CliArgsEnvResolvers.resolveBoolean(
    args["debug"] as boolean | undefined,
    "EXTRACT_DEBUG",
  ),
};

const pg = injectPostgresDbConnection();
const redis = injectRedisConnection();

const config: MadaAdmConfigValues = {
  tablesPrefix: "extract_adm",
  isFkRepeated: false,
  isProvinceRepeated: true,
  isProvinceFkRepeated: false,
  hasGeojson: true,
  hasAdmLevel: false,
};

let pgConnectionParams: PostgresConnectionParams;
const startTime = Date.now();
let jobOutputDir: string | undefined;

try {
  // 3. Establish PostgreSQL Connection
  if (pgParams.url) {
    console.log("🐘 Connecting to PostgreSQL database via URL...");
    console.log(`   URL: ${pgParams.url}`);
    pgConnectionParams = { dbType: DbType.Postgres, connection: pgParams.url };
  } else {
    console.log("🐘 Connecting to PostgreSQL database via configuration...");
    console.log(`   Host:     ${pgParams.host}`);
    console.log(`   Port:     ${pgParams.port}`);
    console.log(`   User:     ${pgParams.user}`);
    console.log(`   Database: ${pgParams.database}`);
    console.log(`   SSL:      ${pgParams.ssl ?? "false"}`);

    const connection: PostgresConnectionConfig = {
      host: pgParams.host!,
      port: pgParams.port!,
      username: pgParams.user!,
      password: pgParams.password!,
      database: pgParams.database!,
      ssl: pgParams.ssl,
      caCertFile: pgParams.caCertFile,
      caCertPath: pgParams.caCertPath,
    };

    pgConnectionParams = {
      dbType: DbType.Postgres,
      connection,
    };
  }
  await pg.connect(pgConnectionParams);
  console.log("✅ PostgreSQL connection established.");

  // Ensure PostGIS extension is enabled for spatial data support
  console.log("🛰️  Enabling PostGIS extension...");
  const client = await pg.pool.connect();
  try {
    await client.queryObject("CREATE EXTENSION IF NOT EXISTS postgis;");
  } finally {
    client.release();
  }

  let mediator: QueueWorkersMediator<
    ExtractAdmInputJobContext,
    Feature,
    AdmRecord,
    ExtractAdmInputJobContext,
    AdmValuesDiscriminated
  >;

  // 4. Optionally Establish Redis Connection
  if (!disableRedis) {
    const redisConfig = redisCliArgs.url ? redisCliArgs.url : {
      host: redisCliArgs.host!,
      port: redisCliArgs.port!,
      username: redisCliArgs.user,
      password: redisCliArgs.password,
      db: redisCliArgs.db,
      ssl: redisCliArgs.ssl,
    } as const;

    if (typeof redisConfig === "string") {
      console.log("\n🔴 Connecting to Redis via URL...");
      console.log(`   URL: ${redisConfig}`);
    } else {
      console.log("\n🔴 Connecting to Redis via configuration...");
      console.log(`   Host: ${redisConfig.host}`);
      console.log(`   Port: ${redisConfig.port}`);
      if (redisConfig.username) {
        console.log(`   User: ${redisConfig.username}`);
      }
      console.log(`   DB:   ${redisConfig.db}`);
      console.log(`   SSL:  ${redisConfig.ssl ?? "false"}`);
    }

    await redis.connect(redisConfig);
    console.log("✅ Redis connection established.");

    mediator = Redis.injectRedisQueueWorkersMediator<
      ExtractAdmInputJobContext,
      Feature,
      AdmRecord,
      ExtractAdmInputJobContext,
      AdmValuesDiscriminated
    >(redis.client!, redisConfig, {
      processingContextKey: "extract-adm:processing:context",
      processingStreamKey: "extract-adm:processing:stream",
      insertContextKey: "extract-adm:insert:context",
      insertStreamKey: "extract-adm:insert:stream",
      processingConsumerGroupName: "extract-adm:processing-group",
      insertConsumerGroupName: "extract-adm:insert-group",
      processingFailedIdsKey: "extract-adm:processing:failed-ids",
      insertFailedIdsKey: "extract-adm:insert:failed-ids",
      persistedLastMessageKey: "extract-adm:persisted-last:message",
      compareMessages: (v1, v2) => {
        return v1.properties.shapeID === v2.properties.shapeID &&
          v1.properties.shapeType === v2.properties.shapeType;
      },
      onRetryPendingPrompt: () => {
        console.log(
          `⚠️  The processings or the insertions of some ADM territories were not completed. Do you want to retry those tasks?`,
        );
        const retry = confirm("Retry?");
        if (!retry) {
          Deno.exit(1);
        }
        return true;
      },
      debug: mediatorCliArgs.debug,
    });
    console.log("✅ Redis Queue Workers Mediator initialized.");
  } else {
    console.log("\nℹ️  Redis connection disabled. Skipping...");

    mediator = InMemory.injectInMemoryQueueWorkersMediator<
      ExtractAdmInputJobContext,
      Feature,
      AdmRecord,
      ExtractAdmInputJobContext,
      AdmValuesDiscriminated
    >({
      processingHwm: mediatorCliArgs.inMemoryProcessingHwm,
      insertHwm: mediatorCliArgs.inMemoryInsertHwm,
    });
    console.log("✅ In-Memory Queue Workers Mediator initialized.");
  }

  // 5. Initialize and create ADM Level tables
  console.log("\n🚀 Preparing ADM Level tables...");

  const ddls: TableDDL[] = [
    injectProvincesPostgresDDL(config, pg, pgParams.schema),
    injectRegionsPostgresDDL(config, pg, pgParams.schema),
    injectDistrictsPostgresDDL(config, pg, pgParams.schema),
    injectCommunesPostgresDDL(config, pg, pgParams.schema),
    injectFokontanysPostgresDDL(config, pg, pgParams.schema),
  ];

  // Check if all tables are already defined to decide whether to prompt for clearing
  const admTablesAreDefined = (
    await Promise.all(ddls.map((ddl) => ddl.exists()))
  ).every((exists) => exists);

  let shouldClearDatabase = false;

  if (!disableRedis && admTablesAreDefined) {
    console.log();
    shouldClearDatabase = confirm(
      "⚠️  ADM tables already exist. Do you want to drop and recreate them? (This will clear all ADM data)",
    );
    console.log();
  } else {
    // If not all tables are defined or Redis is disabled (ephemeral), we must initialize them
    shouldClearDatabase = true;
  }

  // Handle persisted job context for resuming operations
  const prevJobContext = mediator instanceof RedisQueueWorkersMediator
    ? await mediator.persistedContext
    : null;
  if (prevJobContext) {
    let shouldClearContext = false;
    if (shouldClearDatabase) {
      // If we are clearing the database, we must clear the job context to stay in sync
      shouldClearContext = true;
    } else {
      console.log();
      shouldClearContext = confirm(
        "🔄 Previous job context found. Do you want to clear it and start fresh?",
      );
      console.log();
      if (shouldClearContext) {
        // Clearing context usually implies a need for a clean database state
        shouldClearDatabase = true;
      }
    }

    if (shouldClearContext) {
      console.log("🧹 Clearing previous job context...");
      if (mediator instanceof RedisQueueWorkersMediator) {
        await mediator.clearPersisted();
      }
    }
  }

  // Execute database initialization if needed
  if (shouldClearDatabase) {
    console.log("🏗️  Initializing database schema...");
    await pg.transaction(async (txCtx) => {
      // Drop tables in reverse order to respect foreign key constraints
      for (const ddl of [...ddls].reverse()) {
        console.log(`   🗑️  Dropping table: ${ddl.tableName}...`);
        await ddl.drop(txCtx);
      }
      // Create tables in order Level 0 to 4
      for (const ddl of ddls) {
        console.log(`   🏗️  Creating table: ${ddl.tableName}...`);
        await ddl.create(txCtx);
      }
    });
    console.log("✅ ADM Level tables initialized.");
  } else {
    console.log("ℹ️  Existing database schema preserved.");
  }

  /**
   * Resolve the job context:
   * 1. Resume from previous context if available and DB was not cleared.
   * 2. Otherwise, start a fresh context from Level 0 (Province).
   */
  const jobTimestamp = !shouldClearDatabase && prevJobContext?.jobTimestamp
    ? prevJobContext.jobTimestamp
    : Date.now();

  const jobContext: ExtractAdmInputJobContext =
    !shouldClearDatabase && prevJobContext
      ? { ...prevJobContext, jobTimestamp }
      : {
        config,
        currentAdmLevel: AdmLevelCode.PROVINCE,
        pgConnection: pgConnectionParams.connection,
        pgSchema: pgParams.schema!,
        jobTimestamp,
      };

  if (!shouldClearDatabase && prevJobContext) {
    console.log("🔄 Resuming extraction from previous state.");
  } else {
    console.log("🆕 Starting fresh extraction process.");
  }

  console.log(`   Target Schema:  ${pgParams.schema}`);

  const jobOutputDirPath = path.join(
    Deno.cwd(),
    ADM_SEEDING_INPUTS_GENERATED_DIR,
    jobContext.jobTimestamp.toString(),
  );
  jobOutputDir = jobOutputDirPath;
  console.log(`   Output Folder:  ${jobOutputDir}`);

  // 6. Extraction Loop
  const startIndex = ADM_LEVEL_INDEX_BY_CODE.get(
    jobContext.currentAdmLevel,
  ) as number;
  const levelsToProcess = ADM_LEVEL_CODES_INDEXED.slice(startIndex);

  for (const levelCode of levelsToProcess) {
    // Explicitly sync the job context with the current iteration level
    jobContext.currentAdmLevel = levelCode;

    const levelTitle = ADM_LEVEL_TITLE_BY_CODE.get(levelCode) as string;
    const levelIndex = ADM_LEVEL_INDEX_BY_CODE.get(levelCode) as number;
    const ndjsonFilePath = path.join(
      Deno.cwd(),
      ADM_GEOJSON_FILES_PATHS[levelIndex],
    );

    console.log(
      `\n📂 Processing ${levelTitle.toUpperCase()} (${levelCode})...`,
    );
    console.log(`   Source: ${ndjsonFilePath}`);

    // Initialize Worker Pool
    const processingWorkersCount = mediatorCliArgs.processingWorkersCount!;
    const workerOptions: WorkerOptions = {
      type: "module" as const,
    };

    const disableRedisParam = `disable-redis=${disableRedis}`;

    const processingWorkerUrl = new URL(
      "./workers/processing.worker.ts",
      import.meta.url,
    );
    processingWorkerUrl.search = disableRedisParam;

    const processingWorkers = Array.from({
      length: processingWorkersCount,
    }).map(() => new Worker(processingWorkerUrl.href, workerOptions));

    const insertWorkerUrl = new URL(
      "./workers/insert.worker.ts",
      import.meta.url,
    );
    insertWorkerUrl.search = disableRedisParam;

    let insertWorker: Worker | undefined;
    if (levelCode !== AdmLevelCode.FOKONTANY) {
      insertWorker = new Worker(insertWorkerUrl.href, workerOptions);
    }

    const workers: { processing: Worker[]; insert?: Worker } = {
      processing: processingWorkers,
    };

    if (insertWorker) {
      workers.insert = insertWorker;
    }

    // Prepare feature stream with resumption support
    const featureStream: ReadableStream<Feature> =
      (await Deno.open(ndjsonFilePath)).readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(
          new TransformStream<string, Feature>({
            transform(chunk, controller) {
              const feature = JSON.parse(chunk) as Feature;
              controller.enqueue(feature);
            },
          }),
        );

    const admLevelTotalEntriesCount = ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(
        levelCode,
      )!,
      admLevelTotalEntriesCountFormatted = admLevelTotalEntriesCount
        .toLocaleString();
    let admLevelProcessedEntriesCounter = 0;
    let admLevelInsertedEntriesCounter = 0;

    const outputFilename = ADM_SEEDING_INPUT_FILENAMES_BY_CODE.get(levelCode)!;
    let outputWriter: WritableStreamDefaultWriter<Uint8Array> | undefined;
    let outputFile: Deno.FsFile | undefined;

    if (outputFilename) {
      await Deno.mkdir(jobOutputDir, { recursive: true });
      const outputPath = path.join(jobOutputDir, outputFilename);
      outputFile = await Deno.open(outputPath, {
        create: true,
        append: true,
        write: true,
      });
      outputWriter = outputFile.writable.getWriter();
    }

    try {
      await mediator.queue(
        { processing: jobContext, insert: jobContext },
        featureStream,
        workers,
        {
          onProcessingFinished: async (payloads) => {
            const encoder = new TextEncoder();
            for (const payload of payloads) {
              const valuesToPersist = mapAdmRecordToValues(payload);

              let value: string | undefined;
              if (isFokontanyValues(valuesToPersist)) {
                value = valuesToPersist.fokontany;
              } else if (isCommuneValues(valuesToPersist)) {
                value = valuesToPersist.commune;
              } else if (isDistrictValues(valuesToPersist)) {
                value = valuesToPersist.district;
              } else if (isRegionValues(valuesToPersist)) {
                value = valuesToPersist.region;
              } else {
                value = (valuesToPersist as ProvinceValues).province;
              }

              console.log(`✅ Processed ${levelTitle}: ${value}`);

              if (outputWriter) {
                await outputWriter.write(
                  encoder.encode(JSON.stringify(valuesToPersist) + "\n"),
                );
              }
            }

            admLevelProcessedEntriesCounter += payloads.length;
            console.log(
              `⏳ Processing progress: ${admLevelProcessedEntriesCounter.toLocaleString()} / ${admLevelTotalEntriesCountFormatted} ${levelTitle}s (${
                Math.floor(
                  (admLevelProcessedEntriesCounter /
                    admLevelTotalEntriesCount) *
                    100,
                )
              }%)`,
            );
          },
          onInsertFinished: (payloads) => {
            for (const { admLevelCode, values } of payloads) {
              let value: string | undefined;
              switch (admLevelCode) {
                case AdmLevelCode.PROVINCE:
                  value = values.province;
                  break;
                case AdmLevelCode.REGION:
                  value = values.region;
                  break;
                case AdmLevelCode.DISTRICT:
                  value = values.district;
                  break;
                case AdmLevelCode.COMMUNE:
                  value = values.commune;
                  break;
                case AdmLevelCode.FOKONTANY:
                  value = values.fokontany;
                  break;
              }
              console.log(`💾 Inserted ${levelTitle}: ${value}`);
            }
            admLevelInsertedEntriesCounter += payloads.length;
            console.log(
              `⏳ Insert progress: ${admLevelInsertedEntriesCounter.toLocaleString()} / ${admLevelTotalEntriesCountFormatted} ${levelTitle}s (${
                Math.floor(
                  (admLevelInsertedEntriesCounter / admLevelTotalEntriesCount) *
                    100,
                )
              }%)`,
            );
          },
          batchSize: mediatorCliArgs.queueBatchSize,
          maxRetries: mediatorCliArgs.queueMaxRetries,
        },
      );
    } finally {
      if (outputWriter) {
        await outputWriter.close();
      }
    }

    // 10. Deduplicate records for this level
    console.log(`🧹 Deleting duplicates for ${levelTitle}...`);
    const dml = levelCode === AdmLevelCode.PROVINCE
      ? injectProvincesPostgresDML(config, pg, pgParams.schema)
      : levelCode === AdmLevelCode.REGION
      ? injectRegionsPostgresDML(config, pg, pgParams.schema)
      : levelCode === AdmLevelCode.DISTRICT
      ? injectDistrictsPostgresDML(config, pg, pgParams.schema)
      : injectCommunesPostgresDML(config, pg, pgParams.schema);

    await dml.deleteDuplicates();
    console.log(`✅ Duplicates removed for ${levelTitle}.`);

    // Cleanup for this level
    for (const w of processingWorkers) w.terminate();
    insertWorker?.terminate();
    if (mediator instanceof RedisQueueWorkersMediator) {
      await mediator.clearPersisted();
    }

    console.log(`✅ ${levelTitle.toUpperCase()} extraction complete.`);
  }

  console.log("   🧹 Dropping ADM Level tables...");
  await pg.transaction(async (transactionContext) => {
    // Drop in reverse order to respect dependencies if any
    for (const ddl of ddls.toReversed()) {
      await ddl.drop(transactionContext);
    }
  });
  console.log("✅ ADM Level tables dropped.");

  console.log("\n🏁 Extraction process completed successfully.");
} catch (err) {
  console.error(`\n❌ Fatal Error: ${(err as Error).message}`);
  Deno.exit(1);
} finally {
  await pg.close();
  redis.close();

  const totalDurationMs = Date.now() - startTime;
  const totalDurationSeconds = (totalDurationMs / 1000).toFixed(2);
  console.log(`⏱️  Total duration: ${totalDurationSeconds}s`);
  if (jobOutputDir) {
    console.log(`📂 Final outputs stored in: ${jobOutputDir}`);
  }

  console.log("\n👋 Connections closed.");
}
