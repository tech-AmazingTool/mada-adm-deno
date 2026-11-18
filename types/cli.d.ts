import type { DbType } from "@scope/consts/db";

// ── Raw connection sub-types (all fields optional — mirrors CLI with no defaults) ──

/**
 * Raw PostgreSQL configuration options as parsed from CLI flags or environment
 * variables. Every field is optional because no defaults are applied at parse time.
 */
export interface PostgresDbConnectionCliConfig {
  /** Full PostgreSQL connection URL. When set, individual config fields are ignored. */
  url?: string;
  /** Hostname or IP address of the PostgreSQL server. */
  host?: string;
  /** TCP port the PostgreSQL server listens on. */
  port?: number;
  /** Username to authenticate with. */
  user?: string;
  /** Password for the database user. */
  password?: string;
  /** Name of the target database. */
  database?: string;
  /** The physical database schema name. */
  schema?: string;
  /** Whether to enable SSL for the connection. */
  ssl?: boolean;
  /**
   * Filename of a CA certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `caCertPath` when both are provided.
   * Only used when `ssl` is `true`.
   */
  caCertFile?: string;
  /**
   * Full pathname to the CA certificate file.
   * Only used when `ssl` is `true` and `caCertFile` is not set.
   */
  caCertPath?: string;
  /** Maximum number of connections in the pool. */
  connectionLimit?: number;
}

/**
 * Raw MySQL configuration options as parsed from CLI flags or environment
 * variables. Every field is optional because no defaults are applied at parse time.
 */
export interface MySQLDbConnectionCliConfig {
  /** Full MySQL connection URL. When set, individual config fields are ignored. */
  url?: string;
  /** Hostname or IP address of the MySQL server. */
  host?: string;
  /** TCP port the MySQL server listens on. */
  port?: number;
  /** Username to authenticate with. */
  user?: string;
  /** Password for the database user. */
  password?: string;
  /** Name of the target database. */
  database?: string;
  /** Whether to enable SSL for the connection. */
  ssl?: boolean;
  /**
   * Filename of the CA certificate located under the shared `db/.ca-certificates/`
   * directory.
   */
  caCertFile?: string;
  /** Full path to the CA certificate file. */
  caCertPath?: string;
  /**
   * Filename of the client certificate located under the shared `db/.ca-certificates/`
   * directory.
   */
  certFile?: string;
  /** Full path to the client certificate file. */
  certPath?: string;
  /**
   * Filename of the client key located under the shared `db/.ca-certificates/`
   * directory.
   */
  keyFile?: string;
  /** Full path to the client key file. */
  keyPath?: string;
  /** Maximum number of connections in the pool. */
  connectionLimit?: number;
  /** Maximum numner of idle connections in the pool */
  maxIdle?: number;
  /** The maximum time a connection can sit unused in the pool before being closed. */
  idleTimeout?: number;
}

/**
 * SQLite configuration options derived from CLI or environment variables.
 */
export interface SQLiteDbConnectionCliConfig {
  /** Path to the SQLite database file. */
  dbPath?: string;
  /**
   * The file of the SQLite database within the `db/.sqlite` directory.
   */
  dbFile?: string;
}

/**
 * Raw Redis configuration options as parsed from CLI flags or environment
 * variables. Every field is optional because no defaults are applied at parse time.
 */
export interface RedisDbConnectionCliConfig {
  /** Full Redis connection URL. */
  url?: string;
  /** Hostname or IP address of the Redis server. */
  host?: string;
  /** Port the Redis server listens on. */
  port?: number;
  /** Optional username for Redis authentication. */
  user?: string;
  /** Optional password for Redis authentication. */
  password?: string;
  /** Optional database index to select after connection. */
  db?: number;
  /** Whether to use TLS for the connection. */
  ssl?: boolean;
  /**
   * Filename of the client certificate located under the shared
   * `redis/.ca-certificates/` directory.
   */
  certFile?: string;
  /** Full path to the client certificate file. */
  certPath?: string;
  /**
   * Filename of the client key located under the shared
   * `redis/.ca-certificates/` directory.
   */
  keyFile?: string;
  /** Full path to the client key file. */
  keyPath?: string;
  /**
   * Filename of the CA certificate located under the shared
   * `redis/.ca-certificates/` directory.
   */
  caCertFile?: string;
  /** Full path to the CA certificate file. */
  caCertPath?: string;
}

/**
 * Raw MongoDB configuration options as parsed from CLI flags or environment
 * variables. Every field is optional because no defaults are applied at parse time.
 */
export interface MongoDbConnectionCliConfig {
  /** Full MongoDB connection URI. When set, individual config fields are ignored. */
  uri?: string;
  /** Maximum number of connections in the pool. */
  poolSize?: number;
  /** Name of the target database. */
  database?: string;
  /** Whether to use TLS for the connection. */
  tls?: boolean;
  /**
   * Filename of the CA certificate located under the shared `db/.ca-certificates/`
   * directory.
   */
  tlsCaFile?: string;
  /** Full path to the CA certificate file. */
  tlsCaPath?: string;
  /**
   * Filename of the client certificate and key PEM file located under the shared
   * `db/.ca-certificates/` directory.
   */
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

// ── Raw CLI config types (mirrors Cliffy parsed output — everything optional) ──

/**
 * Raw global CLI configuration as populated by Cliffy from flags and environment
 * variables. Every field is optional; defaults are applied later by the resolver.
 * Includes env-var shadow keys that Cliffy injects alongside the structured
 * `pg` / `sqlite` sub-objects.
 */
export type GlobalCliConfig = {
  /** The target database type as a raw string (not yet cast to DbType). */
  dbType?: string;
  /** Whether to enable debug logging across the pipeline. */
  cliDebug?: boolean;
  /** Structured PostgreSQL options from `--pg.*` flags. */
  pg?: PostgresDbConnectionCliConfig;
  /** Structured MySQL options from `--mysql.*` flags. */
  mysql?: MySQLDbConnectionCliConfig;
  /** Structured SQLite options from `--sqlite.*` flags. */
  sqlite?: SQLiteDbConnectionCliConfig;
  /** Structured MongoDB options from `--mongo.*` flags. */
  mongo?: MongoDbConnectionCliConfig;

  // ── Env-var shadow keys injected by Cliffy ──────────────────────────────
  /** Environment variable mapped for PG_URL. */
  pgUrl?: string;
  /** Environment variable mapped for PG_HOST. */
  pgHost?: string;
  /** Environment variable mapped for PG_PORT. */
  pgPort?: number;
  /** Environment variable mapped for PG_USER. */
  pgUser?: string;
  /** Environment variable mapped for PG_PASSWORD. */
  pgPassword?: string;
  /** Environment variable mapped for PG_DATABASE. */
  pgDatabase?: string;
  /** Environment variable mapped for PG_SCHEMA. */
  pgSchema?: string;
  /** Environment variable mapped for PG_SSL. */
  pgSsl?: boolean;
  /** Environment variable mapped for PG_CA_CERT_FILE. */
  pgCaCertFile?: string;
  /** Environment variable mapped for PG_CA_CERT_PATH. */
  pgCaCertPath?: string;
  /** Environment variable mapped for MYSQL_URL. */
  mysqlUrl?: string;
  /** Environment variable mapped for MYSQL_HOST. */
  mysqlHost?: string;
  /** Environment variable mapped for MYSQL_PORT. */
  mysqlPort?: number;
  /** Environment variable mapped for MYSQL_USER. */
  mysqlUser?: string;
  /** Environment variable mapped for MYSQL_PASSWORD. */
  mysqlPassword?: string;
  /** Environment variable mapped for MYSQL_DATABASE. */
  mysqlDatabase?: string;
  /** Environment variable mapped for MYSQL_SSL. */
  mysqlSsl?: boolean;
  /** Environment variable mapped for MYSQL_CA_CERT_FILE. */
  mysqlCaCertFile?: string;
  /** Environment variable mapped for MYSQL_CA_CERT_PATH. */
  mysqlCaCertPath?: string;
  /** Environment variable mapped for MYSQL_CERT_FILE. */
  mysqlCertFile?: string;
  /** Environment variable mapped for MYSQL_CERT_PATH. */
  mysqlCertPath?: string;
  /** Environment variable mapped for MYSQL_KEY_FILE. */
  mysqlKeyFile?: string;
  /** Environment variable mapped for MYSQL_KEY_PATH. */
  mysqlKeyPath?: string;
  /** Environment variable mapped for MYSQL_CONNECTION_LIMIT. */
  mysqlConnectionLimit?: number;
  /** Maximum numner of idle connections in the pool */
  mysqlMaxIdle?: number;
  /** The maximum time a connection can sit unused in the pool before being closed. */
  mysqlIdleTimeout?: number;
  /** Environment variable mapped for PG_CONNECTION_LIMIT. */
  pgConnectionLimit?: number;
  /** Environment variable mapped for SQLITE_DB_FILE. */
  sqliteDbFile?: string;
  /** Environment variable mapped for SQLITE_DB_PATH. */
  sqliteDbPath?: string;
  /** Environment variable mapped for MONGO_URI. */
  mongoUri?: string;
  /** Environment variable mapped for MONGO_POOL_SIZE. */
  mongoPoolSize?: number;
  /** Environment variable mapped for MONGO_DATABASE. */
  mongoDatabase?: string;
  /** Environment variable mapped for MONGO_TLS. */
  mongoTls?: boolean;
  /** Environment variable mapped for MONGO_TLS_CA_FILE. */
  mongoTlsCaFile?: string;
  /** Environment variable mapped for MONGO_TLS_CA_PATH. */
  mongoTlsCaPath?: string;
  /** Environment variable mapped for MONGO_TLS_CERT_KEY_FILE. */
  mongoTlsCertKeyFile?: string;
  /** Environment variable mapped for MONGO_TLS_CERT_KEY_PATH. */
  mongoTlsCertKeyPath?: string;
  /** Environment variable mapped for MONGO_TLS_CERT_PASSWORD. */
  mongoTlsCertPassword?: string;
  /** Environment variable mapped for MONGO_TLS_ALLOW_INVALID_CERTIFICATES. */
  mongoTlsAllowInvalidCertificates?: boolean;
  /** Environment variable mapped for MONGO_TLS_ALLOW_INVALID_HOSTNAMES. */
  mongoTlsAllowInvalidHostnames?: boolean;
};

/**
 * Raw index-action CLI configuration as populated by Cliffy. Extends the global
 * config keys with Redis and mediator-specific fields. Every field is optional;
 * defaults are applied later by the resolver.
 */
export type IndexActionCliConfig = GlobalCliConfig & {
  /** Structured Redis options from `--redis.*` flags. */
  redis?: RedisDbConnectionCliConfig;
  /** Whether to skip the Redis connection entirely. */
  disableRedis?: boolean;

  // ── Redis env-var shadow keys ────────────────────────────────────────────
  /** Environment variable mapped for REDIS_URL. */
  redisUrl?: string;
  /** Environment variable mapped for REDIS_HOST. */
  redisHost?: string;
  /** Environment variable mapped for REDIS_PORT. */
  redisPort?: number;
  /** Environment variable mapped for REDIS_USERNAME. */
  redisUsername?: string;
  /** Environment variable mapped for REDIS_PASSWORD. */
  redisPassword?: string;
  /** Environment variable mapped for REDIS_DB. */
  redisDb?: number;
  /** Environment variable mapped for REDIS_SSL. */
  redisSsl?: boolean;
  /** Environment variable mapped for REDIS_CERT_FILE. */
  redisCertFile?: string;
  /** Environment variable mapped for REDIS_CERT_PATH. */
  redisCertPath?: string;
  /** Environment variable mapped for REDIS_KEY_FILE. */
  redisKeyFile?: string;
  /** Environment variable mapped for REDIS_KEY_PATH. */
  redisKeyPath?: string;
  /** Environment variable mapped for REDIS_CA_CERT_FILE. */
  redisCaCertFile?: string;
  /** Environment variable mapped for REDIS_CA_CERT_PATH. */
  redisCaCertPath?: string;

  // ── Mediator/worker env-var shadow keys ──────────────────────────────────
  /** Environment variable mapped for QUEUE_BATCH_SIZE. */
  queueBatchSize?: number;
  /** Environment variable mapped for QUEUE_MAX_RETRIES. */
  queueMaxRetries?: number;
  /** Environment variable mapped for IN_MEMORY_PROCESSING_HWM. */
  inMemoryProcessingHwm?: number;
  /** Environment variable mapped for IN_MEMORY_INSERT_HWM. */
  inMemoryInsertHwm?: number;
  /** Environment variable mapped for WORKER_HEALTHCHECK_INTERVAL. */
  workerHealthcheckInterval?: number;
  /** Environment variable mapped for WORKER_PENDING_MIN_DURATION_THRESHOLD. */
  workerPendingMinDurationThreshold?: number;
  /** Environment variable mapped for XREAD_BLOCK_DURATION. */
  xreadBlockDuration?: number;
  /** Environment variable mapped for PROCESSING_WORKERS_COUNT. */
  processingWorkersCount?: number;
};

// ── Resolved config types (no shadow keys, required defaults applied) ────────

/**
 * Fully resolved global CLI configuration. All fields with defaults are required.
 * Env-var shadow keys are absent — they have been merged into the structured fields.
 */
export type GlobalCliConfigResolved = {
  /** The target database type. */
  dbType: DbType;
  /** Whether to enable debug logging across the pipeline. */
  cliDebug: boolean;
  /** The PostgreSQL schema name. */
  pgSchema: string;
  /** Resolved PostgreSQL connection configuration. */
  pg: {
    /** Full PostgreSQL connection URL. When set, individual config fields are ignored. */
    url?: string;
    /** Hostname or IP address of the PostgreSQL server. */
    host: string;
    /** TCP port the PostgreSQL server listens on. */
    port: number;
    /** Username to authenticate with. */
    user: string;
    /** Password for the database user. */
    password: string;
    /** Name of the target database. */
    database: string;
    /** Whether to enable SSL for the connection. */
    ssl: boolean;
    /** Filename of the CA certificate under `db/.ca-certificates/`. */
    caCertFile?: string;
    /** Full path to the CA certificate file. */
    caCertPath?: string;
    /** Maximum number of connections in the pool. */
    connectionLimit: number;
  };
  /** Resolved MySQL connection configuration. */
  mysql: {
    /** Full MySQL connection URL. When set, individual config fields are ignored. */
    url?: string;
    /** Hostname or IP address of the MySQL server. */
    host: string;
    /** TCP port the MySQL server listens on. */
    port: number;
    /** Username to authenticate with. */
    user: string;
    /** Password for the database user. */
    password: string;
    /** Name of the target database. */
    database?: string;
    /** Whether to enable SSL for the connection. */
    ssl: boolean;
    /** Filename of the CA certificate under `db/.ca-certificates/`. */
    caCertFile?: string;
    /** Full path to the CA certificate file. */
    caCertPath?: string;
    /** Filename of the client certificate under `db/.ca-certificates/`. */
    certFile?: string;
    /** Full path to the client certificate file. */
    certPath?: string;
    /** Filename of the client key under `db/.ca-certificates/`. */
    keyFile?: string;
    /** Full path to the client key file. */
    keyPath?: string;
    /** Maximum number of connections in the pool. */
    connectionLimit: number;
    /** Maximum number of idle connections in the pool. */
    maxIdle?: number;
    /** The maximum time a connection can sit unused in the pool before being closed. */
    idleTimeout?: number;
  };
  /** Resolved SQLite connection configuration. */
  sqlite: SQLiteDbConnectionCliConfig;
  /** Resolved MongoDB connection configuration. */
  mongo: {
    /** Full MongoDB connection URI. */
    uri: string;
    /** Maximum number of connections in the pool. */
    poolSize: number;
    /** Name of the target database. Optional if present in the URI. */
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
    tlsAllowInvalidCertificates: boolean;
    /** Whether to allow invalid hostnames for the connection. */
    tlsAllowInvalidHostnames: boolean;
  };
};

/**
 * Fully resolved index-action CLI configuration. All fields with defaults are
 * required. The full `pg` block is replaced by `pgSchema: string` since the
 * index action only needs the schema for DML/DDL injection — the connection
 * itself was established by the global action handler.
 */
export type IndexActionCliConfigResolved = {
  /** The target database type. */
  dbType: DbType;
  /** Whether to enable debug logging across the pipeline. */
  cliDebug: boolean;
  /** The PostgreSQL schema name. */
  pgSchema: string;
  /** Resolved Redis connection configuration. */
  redis: {
    /** Full Redis connection URL. */
    url?: string;
    /** Hostname or IP address of the Redis server. */
    host: string;
    /** Port the Redis server listens on. */
    port: number;
    /** Optional username for Redis authentication. */
    user?: string;
    /** Optional password for Redis authentication. */
    password?: string;
    /** Optional database index to select after connection. */
    db?: number;
    /** Whether to use TLS for the connection. */
    ssl: boolean;
    /** Filename of the client certificate under `redis/.ca-certificates/`. */
    certFile?: string;
    /** Full path to the client certificate file. */
    certPath?: string;
    /** Filename of the client key under `redis/.ca-certificates/`. */
    keyFile?: string;
    /** Full path to the client key file. */
    keyPath?: string;
    /** Filename of the CA certificate under `redis/.ca-certificates/`. */
    caCertFile?: string;
    /** Full path to the CA certificate file. */
    caCertPath?: string;
  };
  /** Whether to skip the Redis connection entirely. */
  disableRedis: boolean;
  /** Batch size for processing messages concurrently. */
  queueBatchSize: number;
  /** Maximum number of retries per batch in case of an error. */
  queueMaxRetries: number;
  /** High water mark for in-memory processing workers. */
  inMemoryProcessingHwm: number;
  /** High water mark for the in-memory insert worker. */
  inMemoryInsertHwm: number;
  /** Duration in milliseconds for XREAD BLOCK calls in Redis. */
  xreadBlockDuration: number;
  /** Number of concurrent processing workers to spawn per ADM level. */
  processingWorkersCount: number;
};

/**
 * Database connection configuration subset used by `attemptDbConnection`.
 * Equivalent to the `dbType`, `pg`, and `sqlite` fields of
 * {@link GlobalCliConfigResolved}.
 */
export type DbConnectionCliConfig = Pick<
  GlobalCliConfigResolved,
  "dbType" | "pg" | "mysql" | "sqlite" | "mongo"
>;

/**
 * Extra options passed to database DDL injectors.
 */
export type DbDDLExtraOptionsCliConfig = {
  /** The PostgreSQL schema to use for the table. */
  pgSchema: string;
};

/**
 * Options for updating a field on an ADM entity, including value source and
 * identifying attributes.
 */
export type UpdateFieldCliConfig = {
  value?: string;
  valueFile?: string;
  valuePath?: string;
  province?: string;
  region?: string;
  district?: string;
  commune?: {
    value?: string;
    district?: string;
  };
  fokontany?: {
    value?: string;
    commune?: string;
    district?: string;
  };
};

/**
 * Subset of {@link UpdateFieldCliConfig} containing only the identifier fields.
 */
export type UpdateFieldIdentifiersCliConfig = Pick<
  UpdateFieldCliConfig,
  "province" | "region" | "district" | "commune" | "fokontany"
>;

/**
 * @deprecated Use UpdateFieldCliConfig instead.
 */
export type UpdateFieldCliConfigV1 = {
  value: string;
  province?: string;
  region?: string;
  district?: {
    value: string;
    region: string;
  };
  commune?: {
    value: string;
    district: string;
    region: string;
  };
  fokontany?: {
    value: string;
    commune: string;
    district: string;
    region: string;
  };
};

export type QueryCliCommandType = "name" | "id" | "coordinates";

export type QueryCliCommandLevel =
  | "province"
  | "region"
  | "district"
  | "commune"
  | "fokontany";

export interface QueryCliOptions {
  type: QueryCliCommandType;
  level?: QueryCliCommandLevel;
  pageSize: number;
  [key: string]: unknown;
}
