import { assertEquals } from "@std/assert";

import { DbType } from "@scope/consts/db";
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

import {
  resolveCommonGlobalCliConfig,
  resolveGlobalCliConfig,
  resolveIndexCliConfig,
} from "./cli.helper.ts";

Deno.test("resolveCommonGlobalCliConfig", async (t) => {
  await t.step("applies all defaults when args is empty", () => {
    const { dbType, pgSchema } = resolveCommonGlobalCliConfig({});
    assertEquals(dbType, DbType.SQLite);
    assertEquals(pgSchema, "public");
  });

  await t.step("prefers CLI flag over shadow env keys for pg.schema", () => {
    const { pgSchema } = resolveCommonGlobalCliConfig({
      pg: { schema: "flag-schema" },
      pgSchema: "env-schema",
    });
    assertEquals(pgSchema, "flag-schema");
  });

  await t.step("falls back to shadow env key for pgSchema", () => {
    const { pgSchema } = resolveCommonGlobalCliConfig({
      pgSchema: "env-schema",
    });
    assertEquals(pgSchema, "env-schema");
  });

  await t.step("prefers CLI flag for dbType", () => {
    const { dbType } = resolveCommonGlobalCliConfig({
      dbType: "postgres",
    });
    assertEquals(dbType, DbType.Postgres);
  });
});

Deno.test("resolveGlobalCliConfig", async (t) => {
  await t.step("applies all defaults when args is empty", () => {
    const result = resolveGlobalCliConfig({});
    assertEquals(result.dbType, DbType.SQLite);
    assertEquals(result.cliDebug, false);
    assertEquals(result.pgSchema, "public");
    assertEquals(result.pg.host, "localhost");
    assertEquals(result.pg.port, 5432);
    assertEquals(result.pg.user, "postgres");
    assertEquals(result.pg.password, "");
    assertEquals(result.pg.database, "postgres");
    assertEquals(result.pg.ssl, false);
    assertEquals(result.pg.url, undefined);
    assertEquals(result.pg.caCertFile, undefined);
    assertEquals(result.pg.caCertPath, undefined);
    assertEquals(result.mysql.host, "localhost");
    assertEquals(result.mysql.port, 3306);
    assertEquals(result.mysql.user, "root");
    assertEquals(result.mysql.password, "");
    assertEquals(result.mysql.database, undefined);
    assertEquals(result.mysql.ssl, false);
    assertEquals(result.mysql.url, undefined);
    assertEquals(result.mysql.caCertFile, undefined);
    assertEquals(result.mysql.caCertPath, undefined);
    assertEquals(result.mysql.certFile, undefined);
    assertEquals(result.mysql.certPath, undefined);
    assertEquals(result.mysql.keyFile, undefined);
    assertEquals(result.mysql.keyPath, undefined);
    assertEquals(result.mysql.connectionLimit, 10);
    assertEquals(result.sqlite.dbFile, undefined);
    assertEquals(result.sqlite.dbPath, undefined);
    assertEquals(result.mongo.uri, "mongodb://localhost:27017");
    assertEquals(result.mongo.poolSize, 10);
    assertEquals(result.mongo.tls, false);
    assertEquals(result.mongo.tlsCaFile, undefined);
    assertEquals(result.mongo.tlsCaPath, undefined);
    assertEquals(result.mongo.tlsCertKeyFile, undefined);
    assertEquals(result.mongo.tlsCertKeyPath, undefined);
    assertEquals(result.mongo.tlsCertPassword, undefined);
    assertEquals(result.mongo.tlsAllowInvalidCertificates, false);
    assertEquals(result.mongo.tlsAllowInvalidHostnames, false);
  });

  await t.step(
    "CLI flag --pg.* takes precedence over env-var shadow keys",
    () => {
      const result = resolveGlobalCliConfig({
        pg: { host: "pg-flag-host", port: 9999 },
        pgHost: "pg-env-host",
        pgPort: 1111,
      });
      assertEquals(result.pg.host, "pg-flag-host");
      assertEquals(result.pg.port, 9999);
    },
  );

  await t.step("env-var shadow key falls back when flag is absent", () => {
    const result = resolveGlobalCliConfig({
      pgHost: "env-host",
      pgPort: 5433,
      pgUser: "env-user",
      pgPassword: "env-pass",
      pgDatabase: "env-db",
      pgSchema: "env-schema",
      pgSsl: true,
    });
    assertEquals(result.pg.host, "env-host");
    assertEquals(result.pg.port, 5433);
    assertEquals(result.pg.user, "env-user");
    assertEquals(result.pg.password, "env-pass");
    assertEquals(result.pg.database, "env-db");
    assertEquals(result.pgSchema, "env-schema");
    assertEquals(result.pg.ssl, true);
  });

  await t.step(
    "CLI flag --mysql.connection-limit takes precedence over env-var shadow keys",
    () => {
      const result = resolveGlobalCliConfig({
        mysql: { connectionLimit: 20 },
        mysqlConnectionLimit: 30,
      });
      assertEquals(result.mysql.connectionLimit, 20);
    },
  );

  await t.step(
    "env-var shadow key MYSQL_CONNECTION_LIMIT falls back when flag is absent",
    () => {
      const result = resolveGlobalCliConfig({
        mysqlConnectionLimit: 50,
      });
      assertEquals(result.mysql.connectionLimit, 50);
    },
  );

  await t.step(
    "--pg.schema takes precedence over PG_SCHEMA env-var shadow",
    () => {
      const result = resolveGlobalCliConfig({
        pg: { schema: "flag-schema" },
        pgSchema: "env-schema",
      });
      assertEquals(result.pgSchema, "flag-schema");
    },
  );

  await t.step("dbType is cast to DbType", () => {
    const result = resolveGlobalCliConfig({ dbType: "postgres" });
    assertEquals(result.dbType, DbType.Postgres);
  });

  await t.step("cliDebug coerces undefined to false", () => {
    assertEquals(resolveGlobalCliConfig({}).cliDebug, false);
  });

  await t.step("cliDebug true is preserved", () => {
    assertEquals(resolveGlobalCliConfig({ cliDebug: true }).cliDebug, true);
  });

  await t.step("sqlite dbFile and dbPath are forwarded", () => {
    const result = resolveGlobalCliConfig({
      sqlite: { dbFile: "mydb.db" },
      sqliteDbPath: "/absolute/path.db",
    });
    assertEquals(result.sqlite.dbFile, "mydb.db");
    // dbFile from struct takes precedence; dbPath comes from shadow key
    assertEquals(result.sqlite.dbPath, "/absolute/path.db");
  });

  await t.step(
    "pg caCertFile and caCertPath are forwarded from shadow keys",
    () => {
      const result = resolveGlobalCliConfig({
        pgCaCertFile: "ca.crt",
        pgCaCertPath: "/etc/ssl/ca.crt",
      });
      assertEquals(result.pg.caCertFile, "ca.crt");
      assertEquals(result.pg.caCertPath, "/etc/ssl/ca.crt");
    },
  );

  await t.step(
    "pg.caCertFile struct flag takes precedence over shadow key",
    () => {
      const result = resolveGlobalCliConfig({
        pg: { caCertFile: "flag-ca.crt" },
        pgCaCertFile: "env-ca.crt",
      });
      assertEquals(result.pg.caCertFile, "flag-ca.crt");
    },
  );

  await t.step(
    "CLI flag --mysql.* takes precedence over env-var shadow keys",
    () => {
      const result = resolveGlobalCliConfig({
        mysql: { host: "mysql-flag-host", port: 9999 },
        mysqlHost: "mysql-env-host",
        mysqlPort: 1111,
      });
      assertEquals(result.mysql.host, "mysql-flag-host");
      assertEquals(result.mysql.port, 9999);
    },
  );

  await t.step(
    "env-var shadow key falls back for mysql when flag is absent",
    () => {
      const result = resolveGlobalCliConfig({
        mysqlHost: "env-host",
        mysqlPort: 3307,
        mysqlUser: "env-user",
        mysqlPassword: "env-pass",
        mysqlDatabase: "env-db",
        mysqlSsl: true,
      });
      assertEquals(result.mysql.host, "env-host");
      assertEquals(result.mysql.port, 3307);
      assertEquals(result.mysql.user, "env-user");
      assertEquals(result.mysql.password, "env-pass");
      assertEquals(result.mysql.database, "env-db");
      assertEquals(result.mysql.ssl, true);
    },
  );
  await t.step("MongoDB options and env-var shadow keys", () => {
    const result = resolveGlobalCliConfig({
      mongo: {
        uri: "mongodb://flag-host:27017",
        poolSize: 20,
        database: "test_db",
      },
      mongoTls: true,
      mongoTlsCaPath: "/path/to/ca.pem",
      mongoTlsAllowInvalidCertificates: true,
    });
    assertEquals(result.mongo.uri, "mongodb://flag-host:27017");
    assertEquals(result.mongo.poolSize, 20);
    assertEquals(result.mongo.database, "test_db");
    assertEquals(result.mongo.tls, true);
    assertEquals(result.mongo.tlsCaPath, "/path/to/ca.pem");
    assertEquals(result.mongo.tlsAllowInvalidCertificates, true);
    // Defaults for the rest
    assertEquals(result.mongo.tlsAllowInvalidHostnames, false);
  });
});

Deno.test("resolveIndexCliConfig", async (t) => {
  await t.step("applies all defaults when args is empty", () => {
    const result = resolveIndexCliConfig({});
    // Inherited from global resolver
    assertEquals(result.dbType, DbType.SQLite);
    assertEquals(result.cliDebug, false);
    assertEquals(result.pgSchema, "public");
    // Redis defaults
    assertEquals(result.disableRedis, false);
    assertEquals(result.redis.host, "localhost");
    assertEquals(result.redis.port, 6379);
    assertEquals(result.redis.ssl, false);
    assertEquals(result.redis.url, undefined);
    // Mediator defaults
    assertEquals(result.queueBatchSize, DEFAULT_BATCH_SIZE);
    assertEquals(result.queueMaxRetries, DEFAULT_MAX_RETRIES);
    assertEquals(result.inMemoryProcessingHwm, DEFAULT_WORKER_JOB_HWM);
    assertEquals(result.inMemoryInsertHwm, DEFAULT_WORKER_JOB_HWM);
    assertEquals(result.xreadBlockDuration, DEFAULT_XREAD_BLOCK_DURATION);
    assertEquals(
      result.processingWorkersCount,
      DEFAULT_PROCESSING_WORKERS_COUNT,
    );
  });

  await t.step(
    "--redis.* flags take precedence over env-var shadow keys",
    () => {
      const result = resolveIndexCliConfig({
        redis: { host: "redis-flag", port: 1234 },
        redisHost: "redis-env",
        redisPort: 9999,
      });
      assertEquals(result.redis.host, "redis-flag");
      assertEquals(result.redis.port, 1234);
    },
  );

  await t.step(
    "env-var shadow key falls back for Redis when flag is absent",
    () => {
      const result = resolveIndexCliConfig({
        redisHost: "env-redis",
        redisPort: 6380,
        redisSsl: true,
        redisUsername: "env-user",
        redisPassword: "env-pass",
      });
      assertEquals(result.redis.host, "env-redis");
      assertEquals(result.redis.port, 6380);
      assertEquals(result.redis.ssl, true);
      assertEquals(result.redis.user, "env-user");
      assertEquals(result.redis.password, "env-pass");
    },
  );

  await t.step(
    "mediator env-var shadow keys are used when flags absent",
    () => {
      const result = resolveIndexCliConfig({
        queueBatchSize: 10,
        queueMaxRetries: 5,
        inMemoryProcessingHwm: 32,
        inMemoryInsertHwm: 64,
        xreadBlockDuration: 1000,
        processingWorkersCount: 8,
      });
      assertEquals(result.queueBatchSize, 10);
      assertEquals(result.queueMaxRetries, 5);
      assertEquals(result.inMemoryProcessingHwm, 32);
      assertEquals(result.inMemoryInsertHwm, 64);
      assertEquals(result.xreadBlockDuration, 1000);
      assertEquals(result.processingWorkersCount, 8);
    },
  );

  await t.step("disableRedis coerces undefined to false", () => {
    assertEquals(resolveIndexCliConfig({}).disableRedis, false);
  });

  await t.step("disableRedis true is preserved", () => {
    assertEquals(
      resolveIndexCliConfig({ disableRedis: true }).disableRedis,
      true,
    );
  });

  await t.step("full pg block is absent in resolved output", () => {
    const result = resolveIndexCliConfig({
      pg: { host: "pg-host" },
      pgSchema: "my-schema",
    });
    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).pg, undefined);
    assertEquals(result.pgSchema, "my-schema");
  });
});
