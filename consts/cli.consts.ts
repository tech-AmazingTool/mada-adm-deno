import { DbType } from "./db.consts.ts";

/**
 * Contains the name, version and description of the CLI.
 */
export const CLI_NAME: string = "mada-adm";

/**
 * The version of the CLI.
 */
export const CLI_VERSION: string = "0.1.0";

/**
 * The description of the CLI.
 */
export const CLI_DESCRIPTION: string =
  "Incorporates madagascar's subnational administrative boundaries data into an existing database. It takes care of tables migrations, data seeding, and a few update operations.";

export const DB_TYPE_DESCRIPTION: string =
  `The database type that the command is working with. Either SQLite, MySQL, PostgreSQL (+ PostGIS), or MongoDB. Value: "${DbType.SQLite}" | "${DbType.MySQL}" | "${DbType.Postgres}" | "${DbType.MongoDB}"`;

export const DEBUG_DESCRIPTION: string =
  "Enable debug logging across the pipeline.";

// ── PostgreSQL descriptions ───────────────────────────────────────────────

export const PG_SCHEMA_DESCRIPTION: string =
  "The PostgreSQL schema to use (e.g. public).";

export const PG_URL_DESCRIPTION: string =
  "The URL to connect to the PostgreSQL database.";

export const PG_HOST_DESCRIPTION: string =
  "Hostname or IP address of the PostgreSQL server.";

export const PG_PORT_DESCRIPTION: string =
  "Port number of the PostgreSQL server.";

export const PG_USER_DESCRIPTION: string =
  "Username for authenticating with the PostgreSQL server.";

export const PG_PASSWORD_DESCRIPTION: string =
  "Password for authenticating with the PostgreSQL server.";

export const PG_DATABASE_DESCRIPTION: string =
  "Name of the database to be used.";

export const PG_SSL_DESCRIPTION: string =
  "Whether to use SSL for the connection.";

export const PG_CA_CERT_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --pg.ca-cert-path instead.";

export const PG_CA_CERT_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file. Used when --pg.ca-cert-file is not set.";

export const PG_CONNECTION_LIMIT_DESCRIPTION: string =
  "Maximum number of connections in the PostgreSQL pool (default 10).";

// ── MySQL descriptions ───────────────────────────────────────────────────────

export const MYSQL_URL_DESCRIPTION: string =
  "The URL to connect to the MySQL database.";

export const MYSQL_HOST_DESCRIPTION: string =
  "Hostname or IP address of the MySQL server.";

export const MYSQL_PORT_DESCRIPTION: string =
  "Port number of the MySQL server.";

export const MYSQL_USER_DESCRIPTION: string =
  "Username for authenticating with the MySQL server.";

export const MYSQL_PASSWORD_DESCRIPTION: string =
  "Password for authenticating with the MySQL server.";

export const MYSQL_DATABASE_DESCRIPTION: string =
  "Name of the database to be used.";

export const MYSQL_SSL_DESCRIPTION: string =
  "Whether to use SSL for the connection.";

export const MYSQL_CA_CERT_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --mysql.ca-cert-path instead.";

export const MYSQL_CA_CERT_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file. Used when --mysql.ca-cert-file is not set.";

export const MYSQL_CERT_FILE_DESCRIPTION: string =
  "Filename of the client certificate under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --mysql.cert-path instead.";

export const MYSQL_CERT_PATH_DESCRIPTION: string =
  "Full path to the client certificate file. Used when --mysql.cert-file is not set.";

export const MYSQL_KEY_FILE_DESCRIPTION: string =
  "Filename of the client key under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --mysql.key-path instead.";

export const MYSQL_KEY_PATH_DESCRIPTION: string =
  "Full path to the client key file. Used when --mysql.key-file is not set.";

export const MYSQL_CONNECTION_LIMIT_DESCRIPTION: string =
  "Maximum number of connections in the MySQL pool (default 10).";

export const MYSQL_MAX_IDLE_DESCRIPTION: string =
  "Maximum number of idle connections in the MySQL pool.";

export const MYSQL_IDLE_TIMEOUT_DESCRIPTION: string =
  "The maximum time a connection can sit unused in the pool before being closed.";

// ── SQLite descriptions ─────────────────────────────────────────────────────

export const SQLITE_DB_FILE_DESCRIPTION: string =
  "The file of the SQLite database within the `db/.sqlite` directory. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --sqlite.db-path instead. It defaults to `mada-adm.db`.";

export const SQLITE_DB_PATH_DESCRIPTION: string =
  "Path to the SQLite database file.";

// ── MongoDB descriptions ──────────────────────────────────────────────────────

export const MONGO_URI_DESCRIPTION: string =
  "The URI to connect to the MongoDB database.";

export const MONGO_POOL_SIZE_DESCRIPTION: string =
  "Maximum number of connections in the MongoDB pool (default 10).";

export const MONGO_DATABASE_DESCRIPTION: string =
  "Name of the target MongoDB database.";

export const MONGO_TLS_DESCRIPTION: string =
  "Whether to use TLS for the connection.";

export const MONGO_TLS_CA_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --mongo.tls-ca-path instead.";

export const MONGO_TLS_CA_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file for MongoDB TLS.";

export const MONGO_TLS_CERT_KEY_FILE_DESCRIPTION: string =
  "Filename of the client certificate and key PEM file under db/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --mongo.tls-cert-key-path instead.";

export const MONGO_TLS_CERT_KEY_PATH_DESCRIPTION: string =
  "Full path to the client certificate and key PEM file.";

export const MONGO_TLS_CERT_PASSWORD_DESCRIPTION: string =
  "Password for the client certificate key file if it is encrypted.";

export const MONGO_TLS_ALLOW_INVALID_CERTIFICATES_DESCRIPTION: string =
  "Whether to allow invalid certificates for the connection (never true in production).";

export const MONGO_TLS_ALLOW_INVALID_HOSTNAMES_DESCRIPTION: string =
  "Whether to allow invalid hostnames for the connection (never true in production).";

// ── Redis descriptions ─────────────────────────────────────────────────────

export const DISABLE_REDIS_DESCRIPTION: string =
  'Disable Redis connection ("true" / "1" = disabled, default = enabled).';

export const REDIS_URL_DESCRIPTION: string =
  "Full Redis connection URL. When set, all individual fields are ignored.";

export const REDIS_HOST_DESCRIPTION: string =
  "Hostname or IP address of the Redis server.";

export const REDIS_PORT_DESCRIPTION: string =
  "TCP port the Redis server listens on.";

export const REDIS_USERNAME_DESCRIPTION: string =
  "Optional username for Redis authentication.";

export const REDIS_PASSWORD_DESCRIPTION: string =
  "Optional password for Redis authentication.";

export const REDIS_DB_DESCRIPTION: string =
  "Optional database index (default 0).";

export const REDIS_SSL_DESCRIPTION: string =
  "Enable TLS/SSL for the connection.";

export const REDIS_CERT_FILE_DESCRIPTION: string =
  "Filename of the client certificate under redis/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --redis.cert-path instead.";

export const REDIS_CERT_PATH_DESCRIPTION: string =
  "Full path to the client certificate file.";

export const REDIS_KEY_FILE_DESCRIPTION: string =
  "Filename of the client key under redis/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --redis.key-path instead.";

export const REDIS_KEY_PATH_DESCRIPTION: string =
  "Full path to the client key file.";

export const REDIS_CA_CERT_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under redis/.ca-certificates/. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --redis.ca-cert-path instead.";

export const REDIS_CA_CERT_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file for Redis.";

// ── Mediator / Worker descriptions ──────────────────────────────────────────

export const QUEUE_BATCH_SIZE_DESCRIPTION: string =
  "Batch size for processing messages concurrently.";

export const QUEUE_MAX_RETRIES_DESCRIPTION: string =
  "Maximum number of retries per batch in case of an error.";

export const IN_MEMORY_PROCESSING_HWM_DESCRIPTION: string =
  "Default high water mark for in-memory processing workers.";

export const IN_MEMORY_INSERT_HWM_DESCRIPTION: string =
  "Default high water mark for the in-memory insert worker.";

export const WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION: string =
  "Interval for worker healthcheck in milliseconds.";

export const WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION: string =
  "Threshold for claiming pending messages in milliseconds.";

export const XREAD_BLOCK_DURATION_DESCRIPTION: string =
  "Duration in milliseconds for XREAD BLOCK calls in Redis.";

export const PROCESSING_WORKERS_COUNT_DESCRIPTION: string =
  "Number of concurrent processing workers to spawn per ADM level.";

// Update field command

export const UPDATE_FIELD_COMMAND_NAME = "update-field";

export const UPDATE_FIELD_COMMAND_DESCRIPTION =
  "Updates the field of an ADM record in the database.";

export const UPDATE_FIELD_COMMAND_ARGUMENTS_DESCRIPTIONS = {
  ADM_LEVEL: "The ADM level of the record.",
  FIELD: "The field to update.",
};

export const UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS = {
  PROVINCE: "The name of the province.",
  REGION: "The name of the region.",
  DISTRICT: "The name of the district.",
  COMMUNE: "The name of the commune.",
  COMMUNE_DISTRICT: "The name of the district of the commune.",
  FOKONTANY: "The name of the fokontany.",
  FOKONTANY_COMMUNE: "The name of the commune of the fokontany.",
  FOKONTANY_DISTRICT: "The name of the district of the fokontany.",
};

export const UPDATE_FIELD_COMMAND_VALUE_OPTION_DESCRIPTION =
  "The value to set for the field.";

export const UPDATE_FIELD_COMMAND_VALUE_FILE_OPTION_DESCRIPTION =
  "Filename under commands/.args to read the value from. NOTE: This only works when running from the Deno codebase; it is not supported in the compiled binary as internal directories are encapsulated. Use --value-path for a full path instead.";

export const UPDATE_FIELD_COMMAND_VALUE_PATH_OPTION_DESCRIPTION =
  "Full path to the file to read the value from.";

export const CLI_LARGE_CONTENT_ARGS_DIR = "commands/.args";

export const CLI_VALUE_ARG_FILE = "value.txt";

// Manage configs command

export const MANAGE_CONFIGS_COMMAND_NAME = "manage-config";

export const MANAGE_CONFIGS_COMMAND_DESCRIPTION =
  "Interactively manages Mada ADM configurations stored in the database.";

// Clear command

export const CLEAR_COMMAND_NAME = "clear";

export const CLEAR_COMMAND_DESCRIPTION =
  "Drops all ADM tables and the configuration table from the database.";

// Query command

export const QUERY_COMMAND_NAME = "query";

export const QUERY_COMMAND_DESCRIPTION =
  "Queries the administrative boundaries data inside the database.";

export const QUERY_COMMAND_ARGUMENTS_DESCRIPTIONS = {
  SEARCH:
    'The search term. Can be an ADM territory name, an ID, or geographic coordinates. If passing coordinates, they must be valid geographic coordinates values; wrap them inside double quotes "" if space-separated.',
};

export const QUERY_COMMAND_OPTIONS_DESCRIPTIONS = {
  TYPE:
    'The type of the query. Value: "name" (default), "id", or "coordinates". For "coordinates", the search term must be valid geographic coordinates; wrap them inside double quotes "" if space-separated.',
  LEVEL:
    "The administrative level to query (province, region, district, commune, fokontany). Required for ID query type.",
  PAGE_SIZE:
    "The number of records to return per page in the results of a query by ADM territory name",
};
