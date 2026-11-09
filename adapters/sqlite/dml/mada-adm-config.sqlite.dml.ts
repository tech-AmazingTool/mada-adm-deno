import type { SqliteDbConnection } from "@scope/adapters/sqlite";
import { MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED } from "@scope/consts/db";
import { mapMadaAdmConfigSnakeToCamel } from "@scope/helpers/models";
import type { MadaAdmConfigDML } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { MaybePromise } from "@scope/types/utils";

/**
 * SQLite implementation of the MadaAdmConfigDML interface.
 */
export class MadaAdmConfigSqliteDML implements MadaAdmConfigDML {
  #db: SqliteDbConnection;

  readonly #tableName = MADA_ADM_CONFIGS_TABLE_NAME_SNAKE_CASED;

  constructor(db: SqliteDbConnection) {
    this.#db = db;
  }

  /**
   * Retrieves the currently active MadaAdmConfig record.
   */
  get(): MaybePromise<MadaAdmConfig | null> {
    const sql = `
			SELECT * FROM ${this.#tableName} WHERE is_active = 1 LIMIT 1
		`;
    const stmt = this.#db.client.prepare(sql);
    let res = stmt.get() as unknown as MadaAdmConfigSnakeCased | undefined;
    if (!res) {
      const fallbackSql = `
				SELECT * FROM ${this.#tableName} ORDER BY id DESC LIMIT 1
			`;
      const fallbackStmt = this.#db.client.prepare(fallbackSql);
      res = fallbackStmt.get() as unknown as
        | MadaAdmConfigSnakeCased
        | undefined;
    }
    return res ? mapMadaAdmConfigSnakeToCamel(res) : null;
  }

  /**
   * Retrieves all MadaAdmConfig records.
   */
  getAll(): MaybePromise<MadaAdmConfig[]> {
    const sql = `
			SELECT * FROM ${this.#tableName} ORDER BY id ASC
		`;
    const stmt = this.#db.client.prepare(sql);
    const rows = stmt.all() as unknown as MadaAdmConfigSnakeCased[];
    return rows.map((row) => mapMadaAdmConfigSnakeToCamel(row));
  }

  /**
   * Inserts a new MadaAdmConfig record.
   */
  insert(
    values: MadaAdmConfigValues,
    isActive = true,
  ): MaybePromise<MadaAdmConfig> {
    let insertedId!: number | bigint;
    this.#db.transaction(() => {
      if (isActive) {
        this.#db.client.exec(
          `UPDATE ${this.#tableName} SET is_active = 0 WHERE is_active = 1`,
        );
      }
      const sql = `
				INSERT INTO ${this.#tableName}
				(tables_prefix, is_fk_repeated, is_province_repeated, is_province_fk_repeated, has_geojson, has_adm_level, is_active)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`;
      const stmt = this.#db.client.prepare(sql);
      const res = stmt.run(
        values.tablesPrefix,
        Number(values.isFkRepeated),
        Number(values.isProvinceRepeated),
        Number(values.isProvinceFkRepeated),
        Number(values.hasGeojson),
        Number(values.hasAdmLevel),
        Number(isActive),
      );
      insertedId = res.lastInsertRowid;
    });

    const stmt = this.#db.client.prepare(
      `SELECT * FROM ${this.#tableName} WHERE id = ?`,
    );
    const res = stmt.get(Number(insertedId)) as unknown as
      | MadaAdmConfigSnakeCased
      | undefined;
    if (!res) {
      throw new Error("Failed to retrieve inserted Mada ADM configuration.");
    }
    return mapMadaAdmConfigSnakeToCamel(res);
  }

  /**
   * Updates an existing MadaAdmConfig record by its ID.
   */
  update(
    id: EntityId,
    values: Partial<MadaAdmConfigValues>,
  ): MaybePromise<MadaAdmConfig> {
    const currentStmt = this.#db.client.prepare(
      `SELECT * FROM ${this.#tableName} WHERE id = ?`,
    );
    const current = currentStmt.get(Number(id)) as unknown as
      | MadaAdmConfigSnakeCased
      | undefined;
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

    this.#db.transaction(() => {
      if (values.isActive) {
        this.#db.client.exec(
          `UPDATE ${this.#tableName} SET is_active = 0 WHERE is_active = 1`,
        );
      }
      const sql = `
				UPDATE ${this.#tableName}
				SET tables_prefix = ?,
				is_fk_repeated = ?,
				is_province_repeated = ?,
				is_province_fk_repeated = ?,
				has_geojson = ?,
				has_adm_level = ?,
				is_active = ?,
				updated_at = datetime('now')
				WHERE id = ?
			`;
      const stmt = this.#db.client.prepare(sql);
      stmt.run(
        merged.tablesPrefix,
        Number(merged.isFkRepeated),
        Number(merged.isProvinceRepeated),
        Number(merged.isProvinceFkRepeated),
        Number(merged.hasGeojson),
        Number(merged.hasAdmLevel),
        Number(merged.isActive),
        Number(id),
      );
    });

    const res = currentStmt.get(Number(id)) as unknown as
      | MadaAdmConfigSnakeCased
      | undefined;
    if (!res) {
      throw new Error("Failed to retrieve updated Mada ADM configuration.");
    }
    return mapMadaAdmConfigSnakeToCamel(res);
  }

  /**
   * Marks a specific configuration as active, and deactivates all others.
   */
  setActive(id: EntityId): MaybePromise<MadaAdmConfig> {
    const currentStmt = this.#db.client.prepare(
      `SELECT * FROM ${this.#tableName} WHERE id = ?`,
    );
    const current = currentStmt.get(Number(id)) as unknown as
      | MadaAdmConfigSnakeCased
      | undefined;
    if (!current) {
      throw new Error(`Mada ADM configuration with ID "${id}" not found.`);
    }

    this.#db.transaction(() => {
      this.#db.client.exec(
        `UPDATE ${this.#tableName} SET is_active = 0 WHERE is_active = 1`,
      );
      const updateStmt = this.#db.client.prepare(
        `UPDATE ${this.#tableName} SET is_active = 1, updated_at = datetime('now') WHERE id = ?`,
      );
      updateStmt.run(Number(id));
    });

    const res = currentStmt.get(Number(id)) as unknown as
      | MadaAdmConfigSnakeCased
      | undefined;
    if (!res) {
      throw new Error("Failed to retrieve activated Mada ADM configuration.");
    }
    return mapMadaAdmConfigSnakeToCamel(res);
  }

  /**
   * Deletes a MadaAdmConfig record by its ID.
   */
  delete(id: EntityId): MaybePromise<void> {
    const stmt = this.#db.client.prepare(
      `DELETE FROM ${this.#tableName} WHERE id = ?`,
    );
    stmt.run(Number(id));
  }

  /**
   * Creates or updates the Mada ADM configuration.
   */
  createOrUpdate(values: MadaAdmConfigValues): MaybePromise<MadaAdmConfig> {
    const currentActive = this.get() as MadaAdmConfig | null;
    if (currentActive) {
      return this.update(currentActive.id, values);
    }
    return this.insert(values, true);
  }
}

let madaAdmConfigSqliteDML: MadaAdmConfigSqliteDML | null = null;

export function injectMadaAdmConfigSqliteDML(
  db: SqliteDbConnection,
): MadaAdmConfigSqliteDML {
  if (!madaAdmConfigSqliteDML) {
    madaAdmConfigSqliteDML = new MadaAdmConfigSqliteDML(db);
  }
  return madaAdmConfigSqliteDML;
}

export function resetMadaAdmConfigSqliteDML() {
  madaAdmConfigSqliteDML = null;
}
