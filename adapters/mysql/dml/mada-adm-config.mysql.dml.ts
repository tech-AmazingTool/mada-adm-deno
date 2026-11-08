import { MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED } from "@scope/consts/db";
import { ensureIsMySQLDbTransactionCtx } from "@scope/helpers/db";
import type { MadaAdmConfigDML } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";

import type { MySQLDbConnection } from "../mysql-db.connection.ts";

/**
 * Concrete implementation of the MadaAdmConfigDML interface using MySQL.
 */
export class MadaAdmConfigMySQLDML implements MadaAdmConfigDML {
  constructor(protected db: MySQLDbConnection) {}

  private _mapRowToConfig(row: MadaAdmConfigSnakeCased): MadaAdmConfig {
    return {
      id: row.id,
      createdAt: row.created_at?.toString(),
      updatedAt: row.updated_at?.toString(),
      tablesPrefix: row.tables_prefix,
      isFkRepeated: !!row.is_fk_repeated,
      isProvinceRepeated: !!row.is_province_repeated,
      isProvinceFkRepeated: !!row.is_province_fk_repeated,
      hasGeojson: !!row.has_geojson,
      hasAdmLevel: !!row.has_adm_level,
      isActive: !!row.is_active,
    };
  }

  /**
   * Retrieves the currently active MadaAdmConfig record from the database.
   */
  async get(): Promise<MadaAdmConfig | null> {
    const query =
      `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE is_active = TRUE LIMIT 1;`;
    const [rows] = (await this.db.pool.query(query)) as unknown as [
      MadaAdmConfigSnakeCased[],
      unknown,
    ];
    let row = rows[0];

    if (!row) {
      const fallbackQuery =
        `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id DESC LIMIT 1;`;
      const [fallbackRows] = (await this.db.pool.query(
        fallbackQuery,
      )) as unknown as [MadaAdmConfigSnakeCased[], unknown];
      row = fallbackRows[0];
    }

    if (!row) {
      return null;
    }

    return this._mapRowToConfig(row);
  }

  /**
   * Retrieves all MadaAdmConfig records.
   */
  async getAll(): Promise<MadaAdmConfig[]> {
    const query =
      `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} ORDER BY id ASC;`;
    const [rows] = (await this.db.pool.query(query)) as unknown as [
      MadaAdmConfigSnakeCased[],
      unknown,
    ];
    return rows.map((row) => this._mapRowToConfig(row));
  }

  /**
   * Inserts a new MadaAdmConfig record.
   */
  async insert(
    values: MadaAdmConfigValues,
    isActive = true,
  ): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      if (!ensureIsMySQLDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const connection = transactionContext.connection;
      if (isActive) {
        await connection.query(
          `UPDATE ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
        );
      }
      const insertQuery = `
        INSERT INTO ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} (
          tables_prefix,
          is_fk_repeated,
          is_province_repeated,
          is_province_fk_repeated,
          has_geojson,
          has_adm_level,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      const [result] = (await connection.query(insertQuery, [
        values.tablesPrefix,
        values.isFkRepeated,
        values.isProvinceRepeated,
        values.isProvinceFkRepeated,
        values.hasGeojson,
        values.hasAdmLevel,
        isActive,
      ])) as unknown as [{ insertId: number }, unknown];

      const selectQuery =
        `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = ?;`;
      const [insertedRows] = (await connection.query(selectQuery, [
        result.insertId,
      ])) as unknown as [MadaAdmConfigSnakeCased[], unknown];
      return this._mapRowToConfig(insertedRows[0]);
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
      if (!ensureIsMySQLDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const connection = transactionContext.connection;
      const checkQuery =
        `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = ?;`;
      const [checkRows] =
        (await connection.query(checkQuery, [id])) as unknown as [
          MadaAdmConfigSnakeCased[],
          unknown,
        ];
      const current = checkRows[0];
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
        await connection.query(
          `UPDATE ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
        );
      }

      const updateQuery = `
        UPDATE ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
        SET
          tables_prefix = ?,
          is_fk_repeated = ?,
          is_province_repeated = ?,
          is_province_fk_repeated = ?,
          has_geojson = ?,
          has_adm_level = ?,
          is_active = ?
        WHERE id = ?;
      `;
      await connection.query(updateQuery, [
        merged.tablesPrefix,
        merged.isFkRepeated,
        merged.isProvinceRepeated,
        merged.isProvinceFkRepeated,
        merged.hasGeojson,
        merged.hasAdmLevel,
        merged.isActive,
        id,
      ]);

      const selectQuery =
        `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = ?;`;
      const [updatedRows] = (await connection.query(selectQuery, [
        id,
      ])) as unknown as [MadaAdmConfigSnakeCased[], unknown];
      return this._mapRowToConfig(updatedRows[0]);
    });
  }

  /**
   * Marks a specific configuration as active, and deactivates all others.
   */
  async setActive(id: EntityId): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      if (!ensureIsMySQLDbTransactionCtx(transactionContext)) {
        throw new Error("This method can only be called within a transaction.");
      }
      const connection = transactionContext.connection;
      await connection.query(
        `UPDATE ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} SET is_active = FALSE WHERE is_active = TRUE;`,
      );
      const updateQuery = `
        UPDATE ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED}
        SET is_active = TRUE
        WHERE id = ?;
      `;
      await connection.query(updateQuery, [id]);

      const selectQuery =
        `SELECT * FROM ${MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED} WHERE id = ?;`;
      const [rows] = (await connection.query(selectQuery, [id])) as unknown as [
        MadaAdmConfigSnakeCased[],
        unknown,
      ];
      const row = rows[0];
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

let _instance: MadaAdmConfigMySQLDML | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigMySQLDML}.
 *
 * @param db - The MySQL database connection instance.
 * @returns The instance of the mada adm config DML.
 */
export function injectMadaAdmConfigMySQLDML(
  db: MySQLDbConnection,
): MadaAdmConfigMySQLDML {
  if (!_instance) _instance = new MadaAdmConfigMySQLDML(db);
  return _instance;
}

export function resetMadaAdmConfigMySQLDML(): void {
  _instance = null;
}
