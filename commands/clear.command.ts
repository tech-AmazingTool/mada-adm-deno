import { colors } from "@cliffy/ansi/colors";
import { Command } from "@cliffy/command";
import { Confirm, Select } from "@cliffy/prompt";

import {
  CLEAR_COMMAND_DESCRIPTION,
  CLEAR_COMMAND_NAME,
} from "@scope/consts/cli";
import type { DbType } from "@scope/consts/db";
import { DDL_TRANSACTION_OPTIONS } from "@scope/consts/db";
import {
  injectCommunesDDL,
  injectDbConnection,
  injectDistrictsDDL,
  injectFokontanysDDL,
  injectMadaAdmConfigDML,
  injectProvincesDDL,
  injectRegionsDDL,
  resetCommunesDDL,
  resetDistrictsDDL,
  resetFokontanysDDL,
  resetProvincesDDL,
  resetRegionsDDL,
} from "@scope/db";
import { injectMadaAdmConfigDDL } from "@scope/db/ddl";
import {
  displayMadaAdmConfig,
  resolveCommonGlobalCliConfig,
} from "@scope/helpers/cli";
import type { GlobalCliConfig } from "@scope/types/cli";
import type { DbConnection, DbTransactionContext } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigValues,
} from "@scope/types/models";

/**
 * Supported clear action choices.
 */
type ClearAction = "clear" | "clear-all";

/**
 * CLI sub-command that interactively clears administrative tables and configurations
 * from the database according to the clear command flowchart.
 */
export class CliClearCommand extends Command<GlobalCliConfig, void> {
  /**
   * Initializes the clear sub-command with its name, description, and action
   * handler.
   */
  constructor() {
    super();
    this
      .name(CLEAR_COMMAND_NAME)
      .description(CLEAR_COMMAND_DESCRIPTION)
      .action(async (options) => {
        try {
          await this.handleClear(options);
        } catch (error) {
          console.error(
            `${colors.red("❌ Error:")} ${
              error instanceof Error ? error.message : String(error)
            }\n`,
          );
          Deno.exit(1);
        }
      });
  }

  /**
   * Checks whether all ADM tables exist for the specified configuration.
   *
   * @param config - The Mada ADM configuration to check tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @returns True if all ADM tables exist, false otherwise.
   */
  private async checkAdmTablesExist(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
  ): Promise<boolean> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);

    const exists = (
      await Promise.all([
        provincesDDL.exists(),
        regionsDDL.exists(),
        districtsDDL.exists(),
        communesDDL.exists(),
        fokontanysDDL.exists(),
      ])
    ).every((e) => e);

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);

    return exists;
  }

  /**
   * Drops all ADM tables for the specified configuration in foreign key dependency order.
   *
   * @param config - The Mada ADM configuration to drop tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @param txCtx - Optional transaction context.
   */
  private async dropAdmTables(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
    txCtx?: DbTransactionContext,
  ): Promise<void> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);

    for (
      const ddl of [
        fokontanysDDL,
        communesDDL,
        districtsDDL,
        regionsDDL,
        provincesDDL,
      ]
    ) {
      console.log(`   Dropping the ${ddl.tableName} table ...`);
      await ddl.drop(txCtx);
    }

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);
  }

  /**
   * Main handler: loops interactively to clear tables and/or configuration records
   * according to the clear command flowchart.
   *
   * @param options - The globally resolved CLI configuration.
   */
  private async handleClear(options: GlobalCliConfig): Promise<void> {
    let db!: DbConnection;

    try {
      const { dbType, pgSchema } = resolveCommonGlobalCliConfig(options);
      db = await injectDbConnection(dbType);

      const madaAdmConfigDDL = injectMadaAdmConfigDDL(dbType, db, {
        pgSchema,
      });
      const madaAdmConfigDML = await injectMadaAdmConfigDML(dbType, db, {
        pgSchema,
      });

      const configTableExists = await madaAdmConfigDDL.exists();
      if (!configTableExists) {
        console.log(
          colors.yellow(
            "ℹ️  No Mada ADM configuration found in the database. Nothing to clear.\n",
          ),
        );
        return;
      }

      let quit = false;

      while (!quit) {
        const existingConfigs = await madaAdmConfigDML.getAll();
        if (existingConfigs.length === 0) {
          console.log(
            colors.yellow(
              "ℹ️  No Mada ADM configuration found in the database. Nothing to clear.\n",
            ),
          );
          break;
        }

        console.log(
          colors.blue(
            `Found ${existingConfigs.length} existing Mada ADM configuration(s):`,
          ),
        );
        console.log();
        for (let i = 0; i < existingConfigs.length; i++) {
          const num = i + 1;
          const isActiveSuffix = existingConfigs[i].isActive
            ? " (Active) "
            : " ";
          if (i > 0) {
            console.log();
          }
          displayMadaAdmConfig(`${num}.${isActiveSuffix}`, existingConfigs[i]);
        }
        console.log();

        const actionOptions = [
          {
            name: "Clear ADM tables for a specific configuration",
            value: "clear",
          },
          {
            name: "Clear all ADM tables and configurations",
            value: "clear-all",
          },
        ];

        const action = (await Select.prompt({
          message: "Choose clear action:",
          options: actionOptions,
        })) as ClearAction;
        console.log();

        if (action === "clear") {
          let clearedConfig: MadaAdmConfig;
          if (existingConfigs.length === 1) {
            clearedConfig = existingConfigs[0];
          } else {
            const configIdByChoice = new Map<number, EntityId>();
            for (let i = 0; i < existingConfigs.length; i++) {
              configIdByChoice.set(i + 1, existingConfigs[i].id);
            }
            const chosenNumStr = await Select.prompt({
              message: "Select configuration to clear:",
              options: existingConfigs.map((_, i) => String(i + 1)),
            });
            const targetId = configIdByChoice.get(Number(chosenNumStr))!;
            clearedConfig = existingConfigs.find((c) => c.id === targetId)!;
            console.log();
          }

          const tablesExist = await this.checkAdmTablesExist(
            clearedConfig,
            dbType,
            db,
            pgSchema,
          );

          if (tablesExist) {
            console.log(
              colors.yellow(
                `🗑️ Dropping ADM tables for configuration with prefix "${
                  clearedConfig.tablesPrefix ?? "None"
                }"...`,
              ),
            );
            await db.transaction(async (txCtx) => {
              await this.dropAdmTables(
                clearedConfig,
                dbType,
                db,
                pgSchema,
                txCtx,
              );
            }, DDL_TRANSACTION_OPTIONS);
            console.log(
              colors.green.bold("✅ ADM tables dropped successfully.\n"),
            );
          } else {
            console.log(
              colors.gray("ℹ️  No ADM tables found for this configuration.\n"),
            );
          }

          console.log(
            colors.yellow(
              "⚠️  Do you also want to delete this configuration record from the database?\n",
            ),
          );
          const shouldDelete = await Confirm.prompt({
            message: "Delete this configuration record?",
            default: false,
          });
          console.log();

          if (shouldDelete) {
            await db.transaction(async (txCtx) => {
              await madaAdmConfigDML.delete(clearedConfig.id, txCtx);

              let fallbackActiveConfig: MadaAdmConfig | null = null;
              if (clearedConfig.isActive) {
                const remainingConfigs = existingConfigs.filter(
                  (c) => c.id !== clearedConfig.id,
                );
                if (remainingConfigs.length === 1) {
                  fallbackActiveConfig = remainingConfigs[0];
                  console.log(
                    colors.yellow(
                      "ℹ️  The active configuration was deleted. Automatically activating the only remaining configuration.\n",
                    ),
                  );
                  await madaAdmConfigDML.setActive(
                    fallbackActiveConfig.id,
                    txCtx,
                  );
                } else if (remainingConfigs.length > 1) {
                  console.log(
                    colors.yellow(
                      "ℹ️  The active configuration was deleted. Please choose a new active configuration:",
                    ),
                  );
                  const remainingMap = new Map<number, EntityId>();
                  for (let i = 0; i < remainingConfigs.length; i++) {
                    const num = i + 1;
                    remainingMap.set(num, remainingConfigs[i].id);
                    displayMadaAdmConfig(`${num}.`, remainingConfigs[i]);
                  }
                  console.log();

                  const fallbackNumStr = await Select.prompt({
                    message: "Select new active configuration:",
                    options: remainingConfigs.map((_, i) => String(i + 1)),
                  });
                  const chosenFallbackId = remainingMap.get(
                    Number(fallbackNumStr),
                  )!;
                  fallbackActiveConfig = remainingConfigs.find(
                    (c) => c.id === chosenFallbackId,
                  )!;
                  console.log();
                  await madaAdmConfigDML.setActive(
                    fallbackActiveConfig.id,
                    txCtx,
                  );
                }
              }
            });
            console.log(
              colors.green.bold(
                "✅ Configuration record deleted successfully.\n",
              ),
            );
          }
        } else if (action === "clear-all") {
          console.log(
            colors.red(
              "⚠️  If confirmed, the ADM tables for all configurations will be dropped. Otherwise, the operation will be cancelled.\n",
            ),
          );
          const confirmDropAll = await Confirm.prompt({
            message: "Drop ADM tables for all configurations?",
            default: false,
          });
          console.log();

          if (confirmDropAll) {
            await db.transaction(async (txCtx) => {
              for (const existingConfig of existingConfigs) {
                const tablesExist = await this.checkAdmTablesExist(
                  existingConfig,
                  dbType,
                  db,
                  pgSchema,
                );
                if (tablesExist) {
                  console.log(
                    colors.yellow(
                      `🗑️ Dropping ADM tables for prefix "${
                        existingConfig.tablesPrefix ?? "None"
                      }"...`,
                    ),
                  );
                  await this.dropAdmTables(
                    existingConfig,
                    dbType,
                    db,
                    pgSchema,
                    txCtx,
                  );
                }
              }
            }, DDL_TRANSACTION_OPTIONS);
            console.log(
              colors.green.bold(
                "✅ All ADM tables dropped successfully.\n",
              ),
            );

            console.log(
              colors.red(
                "⚠️  Do you also want to delete all configuration records from the database?\n",
              ),
            );
            const shouldDeleteAll = await Confirm.prompt({
              message: "Delete all configuration records?",
              default: false,
            });
            console.log();

            if (shouldDeleteAll) {
              await madaAdmConfigDML.deleteAll();
              console.log(
                colors.green.bold(
                  "✅ All ADM configuration records deleted successfully.\n",
                ),
              );
              quit = true;
            }
          }
        }

        if (!quit) {
          const remaining = await madaAdmConfigDML.getAll();
          if (remaining.length === 0) {
            quit = true;
          } else {
            const shouldQuit = await Confirm.prompt({
              message: "Quit clear command?",
              default: true,
            });
            console.log();
            quit = shouldQuit;
          }
        }
      }

      console.log(colors.green.bold("✨ Clear operation completed.\n"));
    } finally {
      if (db) {
        await db.close();
        console.log(
          colors.gray("🔌 Database connection closed successfully\n"),
        );
      }
    }
  }
}

let _command: CliClearCommand | null = null;

/**
 * Returns the singleton instance of {@link CliClearCommand},
 * creating it on first call.
 */
export function injectCliClearCommand(): CliClearCommand {
  if (!_command) _command = new CliClearCommand();
  return _command;
}
