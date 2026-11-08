import { ObjectId } from "mongodb";
import { MADA_ADM_CONFIGS_TABLE_NAME_CAMEL_CASED } from "@scope/consts/db";
import { mapMadaAdmConfigBsonToEntity } from "@scope/helpers/models";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigBSON,
  MadaAdmConfigDML,
  MadaAdmConfigValues,
} from "@scope/types/db";

import type { MongoDbConnection } from "../mongo-db.connection.ts";

/**
 * MongoDB implementation of the MadaAdmConfigDML interface.
 */
export class MadaAdmConfigMongoDML implements MadaAdmConfigDML {
  readonly #dbConnection: MongoDbConnection;

  readonly tableName = MADA_ADM_CONFIGS_TABLE_NAME_CAMEL_CASED;

  constructor(dbConnection: MongoDbConnection) {
    this.#dbConnection = dbConnection;
  }

  get #collection() {
    return this.#dbConnection.db.collection<MadaAdmConfigBSON>(this.tableName);
  }

  /**
   * Retrieves the currently active Mada ADM configuration.
   *
   * @returns The configuration entity or null if not found.
   */
  async get(): Promise<MadaAdmConfig | null> {
    let bson = await this.#collection.findOne({ isActive: true });
    if (!bson) {
      bson = await this.#collection.findOne({}, { sort: { _id: -1 } });
    }
    return bson ? mapMadaAdmConfigBsonToEntity(bson) : null;
  }

  /**
   * Retrieves all Mada ADM configurations.
   *
   * @returns An array of all configuration entities.
   */
  async getAll(): Promise<MadaAdmConfig[]> {
    const list = await this.#collection.find({}).sort({ _id: 1 }).toArray();
    return list.map((item) => mapMadaAdmConfigBsonToEntity(item));
  }

  /**
   * Inserts a new Mada ADM configuration record.
   *
   * @param values - The configuration values.
   * @param isActive - Whether to set as active. Defaults to true.
   * @returns The created configuration entity.
   */
  async insert(
    values: MadaAdmConfigValues,
    isActive = true,
  ): Promise<MadaAdmConfig> {
    const now = new Date();
    if (isActive) {
      await this.#collection.updateMany({}, {
        $set: { isActive: false, updatedAt: now },
      });
    }

    const doc: Omit<MadaAdmConfigBSON, "_id"> = {
      tablesPrefix: values.tablesPrefix,
      isFkRepeated: values.isFkRepeated,
      isProvinceRepeated: values.isProvinceRepeated,
      isProvinceFkRepeated: values.isProvinceFkRepeated,
      hasGeojson: values.hasGeojson,
      hasAdmLevel: values.hasAdmLevel,
      isActive,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.#collection.insertOne(doc as MadaAdmConfigBSON);
    const inserted = await this.#collection.findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error("Failed to retrieve inserted Mada ADM configuration.");
    }
    return mapMadaAdmConfigBsonToEntity(inserted);
  }

  /**
   * Updates an existing Mada ADM configuration record by its ID.
   *
   * @param id - The ID of the configuration to update.
   * @param values - Partial configuration values to update.
   * @returns The updated configuration entity.
   */
  async update(
    id: EntityId,
    values: Partial<MadaAdmConfigValues>,
  ): Promise<MadaAdmConfig> {
    const now = new Date();
    const objectId = new ObjectId(id as string);

    if (values.isActive) {
      await this.#collection.updateMany({}, {
        $set: { isActive: false, updatedAt: now },
      });
    }

    const { isActive: _ia, ...restValues } = values;
    const updateDoc: Record<string, unknown> = {
      ...restValues,
      updatedAt: now,
    };
    if (values.isActive !== undefined) {
      updateDoc.isActive = values.isActive;
    }

    const result = await this.#collection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error(`Mada ADM configuration with ID "${id}" not found.`);
    }

    return mapMadaAdmConfigBsonToEntity(result);
  }

  /**
   * Marks a specific configuration as active, and deactivates all others.
   *
   * @param id - The ID of the configuration to activate.
   * @returns The activated configuration entity.
   */
  async setActive(id: EntityId): Promise<MadaAdmConfig> {
    const now = new Date();
    const objectId = new ObjectId(id as string);

    await this.#collection.updateMany({}, {
      $set: { isActive: false, updatedAt: now },
    });

    const result = await this.#collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { isActive: true, updatedAt: now } },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error(`Mada ADM configuration with ID "${id}" not found.`);
    }

    return mapMadaAdmConfigBsonToEntity(result);
  }

  /**
   * Creates or updates the Mada ADM configuration.
   *
   * @param values - The configuration values to set.
   * @returns The created or updated configuration entity.
   */
  async createOrUpdate(values: MadaAdmConfigValues): Promise<MadaAdmConfig> {
    const currentActive = await this.get();
    if (currentActive) {
      return await this.update(currentActive.id, values);
    }
    return await this.insert(values, true);
  }
}

let _instance: MadaAdmConfigMongoDML;

export function injectMadaAdmConfigMongoDML(
  dbConnection: MongoDbConnection,
): MadaAdmConfigDML {
  _instance = _instance ?? new MadaAdmConfigMongoDML(dbConnection);
  return _instance;
}

export function resetMadaAdmConfigMongoDML(): void {
  _instance = undefined as unknown as MadaAdmConfigMongoDML;
}
