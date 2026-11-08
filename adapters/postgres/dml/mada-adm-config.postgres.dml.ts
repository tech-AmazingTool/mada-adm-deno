import { MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED } from "@scope/consts/db";
import { ensureIsPostgresDbTransactionCtx } from "@scope/helpers/db";
import type { MadaAdmConfigDML } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";

import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the MadaAdmConfigDML interface using PostgreSQL.
 */
export class MadaAdmConfigPostgresDML implements MadaAdmConfigDML {
  readonly schema: string;

  constructor(protected db: PostgresDbConnection, schema: string = "public") {
    this.schema = schema;
  }

  private _mapRowToConfig(row: MadaAdmConfigSnakeCased): MadaAdmConfig {
    return {
      id: row.id,
      createdAt: row.created_at?.toString(),
      updatedAt: row.updated_at?.toString(),
      tablesPrefix: row.tables_prefix,
      isFkRepeated: row.is_fk_repeated,
      isProvinceRepeated: row.is_province_repeated,
      isProvinceFkRepeated: row.is_province_fk_repeated,
      hasGeojson: row.has_geojson,
      hasAdmLevel: row.has_adm_level,
      isActive: !!row.is_active,
    };
  }

  /**
   * Retrieves the currently active MadaAdmConfig record from the database.
   */
  async get(): Promise<MadaAdmConfig | null> {
    const query =
      `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE is_active = TRUE LIMIT 1;`;
    const client = await this.db.pool.connect();
    try {
      const result = await client.queryObject<MadaAdmConfigSnakeCased>(query);
      let row = result.rows[0];
      if (!row) {
        const fallbackQuery =
          `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id DESC LIMIT 1;`;
        const fallbackResult = await client.queryObject<
          MadaAdmConfigSnakeCased
        >(fallbackQuery);
        row = fallbackResult.rows[0];
      }
      if (!row) return null;
      return this._mapRowToConfig(row);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all MadaAdmConfig records.
   */
  async getAll(): Promise<MadaAdmConfig[]> {
    const query =
      `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id ASC;`;
    const client = await this.db.pool.connect();
    try {
      const result = await client.queryObject<MadaAdmConfigSnakeCased>(query);
      return result.rows.map((row) => this._mapRowToConfig(row));
    } finally {
      client.release();
    }
  }

  /**
   * Inserts a new MadaAdmConfig record.
   */
  async insert(
    values: MadaAdmConfigValues,
    isActive = true,
  ): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = transactionContext.tx;
      if (isActive) {
        await tx.queryObject(
          `UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
        );
      }
      const insertQuery = `
        INSERT INTO ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} (
          tables_prefix,
          is_fk_repeated,
          is_province_repeated,
          is_province_fk_repeated,
          has_geojson,
          has_adm_level,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const result = await tx.queryObject<MadaAdmConfigSnakeCased>(
        insertQuery,
        [
          values.tablesPrefix,
          values.isFkRepeated,
          values.isProvinceRepeated,
          values.isProvinceFkRepeated,
          values.hasGeojson,
          values.hasAdmLevel,
          isActive,
        ],
      );
      return this._mapRowToConfig(result.rows[0]);
    });
  }

  /**
   * Updates an existing MadaAdmConfig record by its ID.
   */
  async update(
    id: EntityId,
    values: Partial<MadaAdmConfigValues>,
  ): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = transactionContext.tx;
      const checkQuery =
        `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = $1;`;
      const checkResult = await tx.queryObject<MadaAdmConfigSnakeCased>(
        checkQuery,
        [id],
      );
      const current = checkResult.rows[0];
      if (!current) {
        throw new Error(`Mada ADM configuration with ID "${id}" not found.`);
      }

      const merged = {
        tablesPrefix: values.tablesPrefix !== undefined
          ? values.tablesPrefix
          : current.tables_prefix,
        isFkRepeated: values.isFkRepeated !== undefined
          ? values.isFkRepeated
          : Boolean(current.is_fk_repeated),
        isProvinceRepeated: values.isProvinceRepeated !== undefined
          ? values.isProvinceRepeated
          : Boolean(current.is_province_repeated),
        isProvinceFkRepeated: values.isProvinceFkRepeated !== undefined
          ? values.isProvinceFkRepeated
          : Boolean(current.is_province_fk_repeated),
        hasGeojson: values.hasGeojson !== undefined
          ? values.hasGeojson
          : Boolean(current.has_geojson),
        hasAdmLevel: values.hasAdmLevel !== undefined
          ? values.hasAdmLevel
          : Boolean(current.has_adm_level),
        isActive: values.isActive !== undefined
          ? values.isActive
          : Boolean(current.is_active),
      };

      if (values.isActive) {
        await tx.queryObject(
          `UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
        );
      }

      const updateQuery = `
        UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
        SET
          tables_prefix = $1,
          is_fk_repeated = $2,
          is_province_repeated = $3,
          is_province_fk_repeated = $4,
          has_geojson = $5,
          has_adm_level = $6,
          is_active = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *;
      `;
      const result = await tx.queryObject<MadaAdmConfigSnakeCased>(
        updateQuery,
        [
          merged.tablesPrefix,
          merged.isFkRepeated,
          merged.isProvinceRepeated,
          merged.isProvinceFkRepeated,
          merged.hasGeojson,
          merged.hasAdmLevel,
          merged.isActive,
          id,
        ],
      );
      return this._mapRowToConfig(result.rows[0]);
    });
  }

  /**
   * Marks a specific configuration as active, and deactivates all others.
   */
  async setActive(id: EntityId): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = transactionContext.tx;
      await tx.queryObject(
        `UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
      );
      const updateQuery = `
        UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
        SET is_active = TRUE, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const result = await tx.queryObject<MadaAdmConfigSnakeCased>(
        updateQuery,
        [id],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Mada ADM configuration with ID "${id}" not found.`);
      }
      return this._mapRowToConfig(row);
    });
  }

  /**
   * Creates or updates the Mada ADM configuration.
   */
  async createOrUpdate(values: MadaAdmConfigValues): Promise<MadaAdmConfig> {
    const currentActive = await this.get();
    if (currentActive) {
      return await this.update(currentActive.id, values);
    }
    return await this.insert(values, true);
  }
}

let _instance: MadaAdmConfigPostgresDML | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigPostgresDML}.
 *
 * @param db - The PostgreSQL database connection instance.
 * @param schema - The ADM schema binding.
 * @returns The instance of the mada adm config DML.
 */
export function injectMadaAdmConfigPostgresDML(
  db: PostgresDbConnection,
  schema: string = "public",
): MadaAdmConfigPostgresDML {
  if (!_instance) _instance = new MadaAdmConfigPostgresDML(db, schema);
  return _instance;
}

export function resetMadaAdmConfigPostgresDML(): void {
  _instance = null;
}
