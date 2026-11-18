import { MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED } from "@scope/consts/db";
import { ensureIsPostgresDbTransactionCtx } from "@scope/helpers/db";
import type { DbTransactionContext, MadaAdmConfigDML } from "@scope/types/db";
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
   *
   * @param transactionContext - Optional database transaction context.
   */
  async get(
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig | null> {
    const query =
      `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE is_active = TRUE LIMIT 1;`;
    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      const result = await transactionContext.tx.queryObject<
        MadaAdmConfigSnakeCased
      >(query);
      let row = result.rows[0];
      if (!row) {
        const fallbackQuery =
          `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id DESC LIMIT 1;`;
        const fallbackResult = await transactionContext.tx.queryObject<
          MadaAdmConfigSnakeCased
        >(fallbackQuery);
        row = fallbackResult.rows[0];
      }
      return row ? this._mapRowToConfig(row) : null;
    }

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
   *
   * @param transactionContext - Optional database transaction context.
   */
  async getAll(
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig[]> {
    const query =
      `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id ASC;`;
    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      const result = await transactionContext.tx.queryObject<
        MadaAdmConfigSnakeCased
      >(query);
      return result.rows.map((row) => this._mapRowToConfig(row));
    }

    const client = await this.db.pool.connect();
    try {
      const result = await client.queryObject<MadaAdmConfigSnakeCased>(query);
      return result.rows.map((row) => this._mapRowToConfig(row));
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves an exact matching MadaAdmConfig record by its configuration values.
   *
   * @param values - The configuration values to match.
   * @param transactionContext - Optional database transaction context.
   */
  async getExact(
    values: MadaAdmConfigValues,
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig | null> {
    const isPrefixNull = values.tablesPrefix === null ||
      values.tablesPrefix === undefined;
    const query = isPrefixNull
      ? `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
         WHERE tables_prefix IS NULL
           AND is_fk_repeated = $1
           AND is_province_repeated = $2
           AND is_province_fk_repeated = $3
           AND has_geojson = $4
           AND has_adm_level = $5
         LIMIT 1;`
      : `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
         WHERE tables_prefix = $1
           AND is_fk_repeated = $2
           AND is_province_repeated = $3
           AND is_province_fk_repeated = $4
           AND has_geojson = $5
           AND has_adm_level = $6
         LIMIT 1;`;
    const params = isPrefixNull
      ? [
        values.isFkRepeated,
        values.isProvinceRepeated,
        values.isProvinceFkRepeated,
        values.hasGeojson,
        values.hasAdmLevel,
      ]
      : [
        values.tablesPrefix,
        values.isFkRepeated,
        values.isProvinceRepeated,
        values.isProvinceFkRepeated,
        values.hasGeojson,
        values.hasAdmLevel,
      ];

    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      const result = await transactionContext.tx.queryObject<
        MadaAdmConfigSnakeCased
      >(query, params);
      const row = result.rows[0];
      return row ? this._mapRowToConfig(row) : null;
    }

    const client = await this.db.pool.connect();
    try {
      const result = await client.queryObject<MadaAdmConfigSnakeCased>(
        query,
        params,
      );
      const row = result.rows[0];
      return row ? this._mapRowToConfig(row) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Inserts a new MadaAdmConfig record.
   *
   * @param values - The configuration values.
   * @param isActive - Whether to set this record as active. Defaults to true.
   * @param transactionContext - Optional database transaction context.
   */
  async insert(
    values: MadaAdmConfigValues,
    isActive = true,
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig> {
    const run = async (txCtx: DbTransactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(txCtx)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = txCtx.tx;
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
    };

    if (transactionContext) {
      return await run(transactionContext);
    }
    return await this.db.transaction(run);
  }

  /**
   * Updates an existing MadaAdmConfig record by its ID.
   *
   * @param id - The ID of the configuration to update.
   * @param values - The partial configuration values to update.
   * @param transactionContext - Optional database transaction context.
   */
  async update(
    id: EntityId,
    values: Partial<MadaAdmConfigValues>,
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig> {
    const run = async (txCtx: DbTransactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(txCtx)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = txCtx.tx;
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
    };

    if (transactionContext) {
      return await run(transactionContext);
    }
    return await this.db.transaction(run);
  }

  /**
   * Marks a specific configuration as active, and deactivates all others.
   *
   * @param id - The ID of the configuration to activate.
   * @param transactionContext - Optional database transaction context.
   */
  async setActive(
    id: EntityId,
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig> {
    const run = async (txCtx: DbTransactionContext) => {
      if (!ensureIsPostgresDbTransactionCtx(txCtx)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const tx = txCtx.tx;
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
    };

    if (transactionContext) {
      return await run(transactionContext);
    }
    return await this.db.transaction(run);
  }

  /**
   * Deactivates the specified configuration record, or the currently active configuration if omitted.
   *
   * @param id - Optional ID of the configuration to deactivate.
   * @param transactionContext - Optional database transaction context.
   */
  async deactivate(
    id?: EntityId,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const query = id !== undefined
      ? `UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE, updated_at = NOW() WHERE id = $1;`
      : `UPDATE ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE, updated_at = NOW() WHERE is_active = TRUE;`;
    const params = id !== undefined ? [id] : [];

    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      await transactionContext.tx.queryObject(query, params);
      return;
    }

    const client = await this.db.pool.connect();
    try {
      await client.queryObject(query, params);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a MadaAdmConfig record by its ID.
   *
   * @param id - The ID of the configuration to delete.
   * @param transactionContext - Optional database transaction context.
   */
  async delete(
    id: EntityId,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const query =
      `DELETE FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = $1;`;
    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      await transactionContext.tx.queryObject(query, [id]);
      return;
    }

    const client = await this.db.pool.connect();
    try {
      await client.queryObject(query, [id]);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes all MadaAdmConfig records from the table.
   *
   * @param transactionContext - Optional database transaction context.
   */
  async deleteAll(transactionContext?: DbTransactionContext): Promise<void> {
    const query =
      `DELETE FROM ${this.schema}.${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED};`;
    if (transactionContext) {
      if (!ensureIsPostgresDbTransactionCtx(transactionContext)) {
        throw new Error("Invalid Postgres transaction context.");
      }
      await transactionContext.tx.queryObject(query);
      return;
    }

    const client = await this.db.pool.connect();
    try {
      await client.queryObject(query);
    } finally {
      client.release();
    }
  }

  /**
   * Creates or updates the Mada ADM configuration.
   *
   * @param values - The configuration values.
   * @param transactionContext - Optional database transaction context.
   */
  async createOrUpdate(
    values: MadaAdmConfigValues,
    transactionContext?: DbTransactionContext,
  ): Promise<MadaAdmConfig> {
    const currentActive = await this.get(transactionContext);
    if (currentActive) {
      return await this.update(currentActive.id, values, transactionContext);
    }
    return await this.insert(values, true, transactionContext);
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
