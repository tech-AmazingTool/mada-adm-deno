import {
  DbType,
  MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED,
} from "@scope/consts/db";
import type {
  DbTransactionContext,
  PostgresTransactionContext,
  TableDDL,
} from "@scope/types/db";

import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the Mada ADM configuration table
 * using PostgreSQL. It manages the `mada_adm_config` table schema.
 */
export class MadaAdmConfigPostgresDDL implements TableDDL {
  /** The physical database table name. */
  static readonly TABLE_NAME = MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED;

  /** The physical database schema name. */
  readonly schema: string;

  /**
   * Initializes a new instance of MadaAdmConfigPostgresDDL.
   *
   * @param db - The PostgreSQL database connection instance.
   * @param schema - The physical database schema name. Defaults to 'public'.
   */
  constructor(protected db: PostgresDbConnection, schema: string = "public") {
    this.schema = schema;
  }

  /**
   * Gets the physical database table name.
   */
  get tableName(): string {
    return MadaAdmConfigPostgresDDL.TABLE_NAME;
  }

  ensureIsPostgresTransactionContext(
    transactionContext?: DbTransactionContext,
  ): transactionContext is PostgresTransactionContext {
    if (transactionContext) {
      if (transactionContext.dbType !== DbType.Postgres) {
        throw new Error(
          "Transaction context type does not match database type",
        );
      }
      return true;
    }
    return false;
  }

  /**
   * Creates the `mada_adm_config` physical table in the PostgreSQL database if it does not already exist.
   *
   * @returns A promise that resolves when the table creation is complete.
   */
  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.schema}.${MadaAdmConfigPostgresDDL.TABLE_NAME} (
        id SERIAL PRIMARY KEY,
        tables_prefix VARCHAR(50),
        is_fk_repeated BOOLEAN NOT NULL DEFAULT TRUE,
        is_province_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        is_province_fk_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        has_geojson BOOLEAN NOT NULL DEFAULT FALSE,
        has_adm_level BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    const isTx = this.ensureIsPostgresTransactionContext(transactionContext);
    const client = isTx ? null : await this.db.pool.connect();
    const executor = isTx ? transactionContext.tx : client!;
    try {
      await executor.queryObject(query);
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Drops the `mada_adm_config` physical table from the PostgreSQL database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  async drop(transactionContext?: DbTransactionContext): Promise<void> {
    const query =
      `DROP TABLE IF EXISTS ${this.schema}.${MadaAdmConfigPostgresDDL.TABLE_NAME};`;
    const isTx = this.ensureIsPostgresTransactionContext(transactionContext);
    const client = isTx ? null : await this.db.pool.connect();
    const executor = isTx ? transactionContext.tx : client!;
    try {
      await executor.queryObject(query);
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Checks if the `mada_adm_config` physical table exists in the PostgreSQL database.
   *
   * @returns A promise that resolves to true if the table exists, false otherwise.
   */
  async exists(transactionContext?: DbTransactionContext): Promise<boolean> {
    const query = `
      SELECT EXISTS (
         SELECT FROM pg_tables
         WHERE  schemaname = '${this.schema}'
         AND    tablename  = '${MadaAdmConfigPostgresDDL.TABLE_NAME}'
      );
    `;
    const isTx = this.ensureIsPostgresTransactionContext(transactionContext);
    const client = isTx ? null : await this.db.pool.connect();
    const executor = isTx ? transactionContext.tx : client!;
    try {
      const result = await executor.queryObject<{ exists: boolean }>(query);
      return result.rows[0]?.exists ?? false;
    } finally {
      if (client) client.release();
    }
  }
}

let _instance: MadaAdmConfigPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigPostgresDDL}.
 *
 * @param db - The PostgreSQL database connection instance.
 * @param schema - The ADM schema binding.
 * @returns The instance of the mada adm config table DDL.
 */
export function injectMadaAdmConfigPostgresDDL(
  db: PostgresDbConnection,
  schema: string = "public",
): MadaAdmConfigPostgresDDL {
  if (!_instance) _instance = new MadaAdmConfigPostgresDDL(db, schema);
  return _instance;
}

/**
 * Resets the singleton instance of the mada adm config table DDL.
 */
export function resetMadaAdmConfigPostgresDDL(): void {
  _instance = null;
}
