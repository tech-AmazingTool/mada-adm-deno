import { MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED } from "@scope/consts/db";
import { ensureIsMySQLDbTransactionCtx } from "@scope/helpers/db";
import type { DbTransactionContext, TableDDL } from "@scope/types/db";

import type { MySQLDbConnection } from "../mysql-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the Mada ADM configuration table
 * using MySQL. It manages the `mada_adm_config` table schema.
 */
export class MadaAdmConfigMySQLDDL implements TableDDL {
  /** The physical database table name. */
  static readonly TABLE_NAME = MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED;

  /**
   * Initializes a new instance of MadaAdmConfigMySQLDDL.
   *
   * @param db - The MySQL database connection instance.
   */
  constructor(protected db: MySQLDbConnection) {}

  /**
   * Gets the physical database table name.
   */
  get tableName(): string {
    return MadaAdmConfigMySQLDDL.TABLE_NAME;
  }

  /**
   * Creates the `mada_adm_config` physical table in the MySQL database if it does not already exist.
   *
   * @returns A promise that resolves when the table creation is complete.
   */
  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MadaAdmConfigMySQLDDL.TABLE_NAME} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tables_prefix VARCHAR(50),
        is_fk_repeated BOOLEAN NOT NULL DEFAULT TRUE,
        is_province_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        is_province_fk_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        has_geojson BOOLEAN NOT NULL DEFAULT FALSE,
        has_adm_level BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    const client = ensureIsMySQLDbTransactionCtx(transactionContext)
      ? transactionContext.connection
      : this.db.pool;
    await client.query(query);
  }

  /**
   * Drops the `mada_adm_config` physical table from the MySQL database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  async drop(transactionContext?: DbTransactionContext): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${MadaAdmConfigMySQLDDL.TABLE_NAME};`;
    const client = ensureIsMySQLDbTransactionCtx(transactionContext)
      ? transactionContext.connection
      : this.db.pool;
    await client.query(query);
  }

  /**
   * Checks if the `mada_adm_config` physical table exists in the MySQL database.
   *
   * @returns A promise that resolves to true if the table exists, false otherwise.
   */
  async exists(transactionContext?: DbTransactionContext): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = '${MadaAdmConfigMySQLDDL.TABLE_NAME}';
    `;
    const client = ensureIsMySQLDbTransactionCtx(transactionContext)
      ? transactionContext.connection
      : this.db.pool;
    const [rows] = (await client.query(query)) as unknown as [
      { count: number }[],
      unknown,
    ];
    return rows[0].count > 0;
  }
}

let _instance: MadaAdmConfigMySQLDDL | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigMySQLDDL}.
 *
 * @param db - The MySQL database connection instance.
 * @returns The instance of the mada adm config table DDL.
 */
export function injectMadaAdmConfigMySQLDDL(
  db: MySQLDbConnection,
): MadaAdmConfigMySQLDDL {
  if (!_instance) _instance = new MadaAdmConfigMySQLDDL(db);
  return _instance;
}

/**
 * Resets the singleton instance of the mada adm config table DDL.
 */
export function resetMadaAdmConfigMySQLDDL(): void {
  _instance = null;
}
