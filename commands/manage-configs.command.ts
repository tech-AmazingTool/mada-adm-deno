import { colors } from "@cliffy/ansi/colors";
import { Command } from "@cliffy/command";
import { Confirm, Select } from "@cliffy/prompt";

import {
  MANAGE_CONFIGS_COMMAND_DESCRIPTION,
  MANAGE_CONFIGS_COMMAND_NAME,
} from "@scope/consts/cli";
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
  promptMadaAdmConfig,
  resolveCommonGlobalCliConfig,
} from "@scope/helpers/cli";
import type { GlobalCliConfig } from "@scope/types/cli";
import type { DbConnection } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigValues,
} from "@scope/types/models";

/**
 * CLI sub-command that interactively manages Mada ADM configurations stored
 * in the database (creating, updating, switching active, or deleting), and
 * optionally rebuilds the ADM tables when the active configuration changes.
 */
export class CliManageConfigsCommand extends Command<GlobalCliConfig, void> {
  /**
   * Initializes the manage-config sub-command with its name, description, and
   * interactive action handler.
   */
  constructor() {
    super();
    this
      .name(MANAGE_CONFIGS_COMMAND_NAME)
      .description(MANAGE_CONFIGS_COMMAND_DESCRIPTION)
      .action(async (options) => {
        try {
          await this.handleManageConfigs(options);
        } catch (error) {
          console.error(
            `\n${colors.red("❌ Error:")} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          Deno.exit(1);
        }
      });
  }

  /**
   * Main handler: displays configurations, prompts for an action, applies changes,
   * and conditionally handles table dropping and recreation when active configuration changes.
   *
   * @param options - The globally resolved CLI configuration.
   */
  private async handleManageConfigs(options: GlobalCliConfig): Promise<void> {
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

      const tableExists = await madaAdmConfigDDL.exists();
      if (!tableExists) {
        await madaAdmConfigDDL.create();
      }

      const prevActiveConfig = await madaAdmConfigDML.get();
      let allConfigs = await madaAdmConfigDML.getAll();
      let newActiveConfig: MadaAdmConfig | null = prevActiveConfig;
      let activeChanged = false;

      if (allConfigs.length === 0) {
        console.log(
          colors.yellow(
            `ℹ️  No existing ADM configuration found. Please provide the configuration values:\n`,
          ),
        );
        const result = await promptMadaAdmConfig();
        const rawTablesPrefix = (result.tablesPrefix as string) ?? "";
        const tablesPrefix = rawTablesPrefix.trim() || null;
        const configToInsert: MadaAdmConfigValues = {
          tablesPrefix,
          isFkRepeated: result.isFkRepeated as boolean,
          isProvinceRepeated: result.isProvinceRepeated as boolean,
          isProvinceFkRepeated: result.isProvinceFkRepeated as boolean,
          hasGeojson: result.hasGeojson as boolean,
          hasAdmLevel: result.hasAdmLevel as boolean,
        };
        const inserted = await madaAdmConfigDML.insert(configToInsert, true);
        newActiveConfig = inserted;
        activeChanged = true;
        displayMadaAdmConfig("Active Mada ADM Configuration", inserted);
      } else {
        console.log(
          colors.blue(
            `\nFound ${allConfigs.length} existing Mada ADM configuration(s):`,
          ),
        );
        const configIdByChoiceNumber = new Map<number, EntityId>();
        for (let i = 0; i < allConfigs.length; i++) {
          const num = i + 1;
          configIdByChoiceNumber.set(num, allConfigs[i].id);
          const isActiveSuffix = allConfigs[i].isActive ? " (Active) " : " ";
          displayMadaAdmConfig(`${num}.${isActiveSuffix}`, allConfigs[i]);
        }
        console.log();

        const actionOptions = [
          { name: "Create a new configuration", value: "create" },
          {
            name: "Update an existing configuration",
            value: "update",
          },
          { name: "Switch active configuration", value: "switch" },
        ];
        if (allConfigs.length > 1) {
          actionOptions.push({
            name: "Delete a configuration",
            value: "delete",
          });
        }

        const actionChoice = await Select.prompt({
          message: "Choose ADM configuration management action:",
          options: actionOptions,
        });
        console.log();

        if (actionChoice === "create") {
          console.log(
            colors.yellow(
              `ℹ️  Creating a new Mada ADM configuration:`,
            ),
          );
          const result = await promptMadaAdmConfig();
          const rawTablesPrefix = (result.tablesPrefix as string) ?? "";
          const tablesPrefix = rawTablesPrefix.trim() || null;

          const setActive = await Confirm.prompt({
            message: "Set as active configuration?",
            default: true,
          });

          const configToInsert: MadaAdmConfigValues = {
            tablesPrefix,
            isFkRepeated: result.isFkRepeated as boolean,
            isProvinceRepeated: result.isProvinceRepeated as boolean,
            isProvinceFkRepeated: result.isProvinceFkRepeated as boolean,
            hasGeojson: result.hasGeojson as boolean,
            hasAdmLevel: result.hasAdmLevel as boolean,
          };

          const inserted = await madaAdmConfigDML.insert(
            configToInsert,
            setActive,
          );
          console.log(
            colors.green.bold(
              `\n✅ New Mada ADM configuration created successfully.`,
            ),
          );
          displayMadaAdmConfig("Created Mada ADM Configuration", inserted);
          console.log();

          if (setActive) {
            newActiveConfig = inserted;
            activeChanged = true;
          }
        } else if (actionChoice === "update") {
          const chosenNumStr = await Select.prompt({
            message: "Select configuration to update:",
            options: allConfigs.map((_, i) => String(i + 1)),
          });
          const targetConfigId = configIdByChoiceNumber.get(
            Number(chosenNumStr),
          )!;
          const targetConfig = allConfigs.find((c) => c.id === targetConfigId)!;
          console.log();

          console.log(
            colors.yellow(
              `ℹ️  Updating configuration ${chosenNumStr}:`,
            ),
          );
          const result = await promptMadaAdmConfig(targetConfig);
          const rawTablesPrefix = (result.tablesPrefix as string) ?? "";
          const tablesPrefix = rawTablesPrefix.trim() || null;
          console.log();

          let shouldActivate = targetConfig.isActive;
          if (!targetConfig.isActive) {
            shouldActivate = await Confirm.prompt({
              message: "Set this configuration as active?",
              default: false,
            });
            console.log();
          }

          const configToUpdate: Partial<MadaAdmConfigValues> = {
            tablesPrefix,
            isFkRepeated: result.isFkRepeated as boolean,
            isProvinceRepeated: result.isProvinceRepeated as boolean,
            isProvinceFkRepeated: result.isProvinceFkRepeated as boolean,
            hasGeojson: result.hasGeojson as boolean,
            hasAdmLevel: result.hasAdmLevel as boolean,
            isActive: shouldActivate,
          };

          const updated = await madaAdmConfigDML.update(
            targetConfig.id,
            configToUpdate,
          );
          console.log(
            colors.green.bold(
              `✅ Mada ADM configuration updated successfully.`,
            ),
          );
          displayMadaAdmConfig("Updated Mada ADM Configuration", updated);
          console.log();

          if (shouldActivate) {
            newActiveConfig = updated;
            activeChanged = true;
          }
        } else if (actionChoice === "switch") {
          const chosenNumStr = await Select.prompt({
            message: "Select an ADM configuration to activate:",
            options: allConfigs.map((_, i) => String(i + 1)),
          });
          const targetConfigId = configIdByChoiceNumber.get(
            Number(chosenNumStr),
          )!;
          const activated = await madaAdmConfigDML.setActive(targetConfigId);
          console.log();
          console.log(
            colors.green.bold(
              `✅ Activated Mada ADM configuration successfully.`,
            ),
          );
          displayMadaAdmConfig("Active Mada ADM Configuration", activated);
          console.log();

          newActiveConfig = activated;
          activeChanged = true;
        } else if (actionChoice === "delete") {
          const chosenNumStr = await Select.prompt({
            message: "Select configuration to delete:",
            options: allConfigs.map((_, i) => String(i + 1)),
          });
          const targetConfigId = configIdByChoiceNumber.get(
            Number(chosenNumStr),
          )!;
          const targetConfig = allConfigs.find((c) => c.id === targetConfigId)!;

          await madaAdmConfigDML.delete(targetConfigId);
          console.log();
          console.log(
            colors.green.bold(
              `✅ Configuration deleted successfully.`,
            ),
          );
          console.log();

          if (targetConfig.isActive) {
            allConfigs = await madaAdmConfigDML.getAll();
            if (allConfigs.length === 1) {
              const remainingActivated = await madaAdmConfigDML.setActive(
                allConfigs[0].id,
              );
              console.log(
                colors.yellow(
                  `ℹ️  The active configuration was deleted. Automatically set the sole remaining configuration as active:`,
                ),
              );
              displayMadaAdmConfig(
                "Active Mada ADM Configuration",
                remainingActivated,
              );
              newActiveConfig = remainingActivated;
              activeChanged = true;
            } else if (allConfigs.length > 1) {
              console.log(
                colors.yellow(
                  `ℹ️  The active configuration was deleted. Please choose a new active configuration from remaining configs:`,
                ),
              );
              const remainingMap = new Map<number, EntityId>();
              for (let i = 0; i < allConfigs.length; i++) {
                const num = i + 1;
                remainingMap.set(num, allConfigs[i].id);
                displayMadaAdmConfig(`${num}.`, allConfigs[i]);
              }
              console.log();
              const newActiveNumStr = await Select.prompt({
                message: "Select configuration to activate:",
                options: allConfigs.map((_, i) => String(i + 1)),
              });
              const chosenNewActiveId = remainingMap.get(
                Number(newActiveNumStr),
              )!;
              const activated = await madaAdmConfigDML.setActive(
                chosenNewActiveId,
              );
              console.log();
              console.log(
                colors.green.bold(
                  `✅ Activated new configuration successfully.`,
                ),
              );
              displayMadaAdmConfig("Active Mada ADM Configuration", activated);
              newActiveConfig = activated;
              activeChanged = true;
            }
          }
        }
      }

      // ── Table Management Flow (When Active Configuration Changed) ───────
      if (activeChanged && newActiveConfig) {
        const isSamePrefix = prevActiveConfig !== null &&
          prevActiveConfig.tablesPrefix === newActiveConfig.tablesPrefix;

        let shouldRecreateTargetTables = false;
        let previousTablesDropped = false;

        if (prevActiveConfig) {
          const prevProvincesDDL = injectProvincesDDL(
            prevActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const prevRegionsDDL = injectRegionsDDL(
            prevActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const prevDistrictsDDL = injectDistrictsDDL(
            prevActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const prevCommunesDDL = injectCommunesDDL(
            prevActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const prevFokontanysDDL = injectFokontanysDDL(
            prevActiveConfig,
            dbType,
            db,
            { pgSchema },
          );

          const prevTablesExist = (
            await Promise.all([
              prevProvincesDDL.exists(),
              prevRegionsDDL.exists(),
              prevDistrictsDDL.exists(),
              prevCommunesDDL.exists(),
              prevFokontanysDDL.exists(),
            ])
          ).every((exists) => exists);

          if (prevTablesExist) {
            if (isSamePrefix) {
              const shouldClearAndRecreate = await Confirm.prompt({
                message:
                  "Clear the ADM tables built with the previous configuration and create new ones according to the new configuration?",
                default: false,
              });
              console.log();

              if (shouldClearAndRecreate) {
                console.log(
                  colors.yellow(
                    `🗑️  Dropping ADM tables built with the previous configuration...`,
                  ),
                );
                await db.transaction(async (txCtx) => {
                  for (
                    const ddl of [
                      prevFokontanysDDL,
                      prevCommunesDDL,
                      prevDistrictsDDL,
                      prevRegionsDDL,
                      prevProvincesDDL,
                    ]
                  ) {
                    console.log(`   Dropping the ${ddl.tableName} table ...`);
                    await ddl.drop(txCtx);
                  }
                }, DDL_TRANSACTION_OPTIONS);
                console.log();
                console.log(
                  colors.green(`✅ Old ADM tables dropped successfully.`),
                );
                previousTablesDropped = true;
                shouldRecreateTargetTables = true;
              }
            } else {
              const prevPrefixDisplay = prevActiveConfig.tablesPrefix ?? "None";
              const shouldDropOld = await Confirm.prompt({
                message:
                  `Clear the ADM tables built with the previous configuration (Tables prefix: "${prevPrefixDisplay}")?`,
                default: false,
              });
              console.log();

              if (shouldDropOld) {
                console.log(
                  colors.yellow(
                    `🗑️  Dropping previous ADM tables with prefix "${prevPrefixDisplay}"...`,
                  ),
                );
                await db.transaction(async (txCtx) => {
                  for (
                    const ddl of [
                      prevFokontanysDDL,
                      prevCommunesDDL,
                      prevDistrictsDDL,
                      prevRegionsDDL,
                      prevProvincesDDL,
                    ]
                  ) {
                    console.log(`   Dropping the ${ddl.tableName} table ...`);
                    await ddl.drop(txCtx);
                  }
                }, DDL_TRANSACTION_OPTIONS);
                console.log();
                console.log(
                  colors.green(`✅ Old ADM tables dropped successfully.`),
                );
                console.log();
                previousTablesDropped = true;
              }
            }
          }

          resetProvincesDDL(dbType);
          resetRegionsDDL(dbType);
          resetDistrictsDDL(dbType);
          resetCommunesDDL(dbType);
          resetFokontanysDDL(dbType);
        }

        // ── Step 2: Manage New Target Tables (If not already handled by same-prefix flow) ──
        if (!isSamePrefix || !prevActiveConfig || shouldRecreateTargetTables) {
          const newProvincesDDL = injectProvincesDDL(
            newActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const newRegionsDDL = injectRegionsDDL(
            newActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const newDistrictsDDL = injectDistrictsDDL(
            newActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const newCommunesDDL = injectCommunesDDL(
            newActiveConfig,
            dbType,
            db,
            { pgSchema },
          );
          const newFokontanysDDL = injectFokontanysDDL(
            newActiveConfig,
            dbType,
            db,
            { pgSchema },
          );

          const targetTablesExist = (await Promise.all([
            newProvincesDDL.exists(),
            newRegionsDDL.exists(),
            newDistrictsDDL.exists(),
            newCommunesDDL.exists(),
            newFokontanysDDL.exists(),
          ])).some((exists) => exists);

          if (targetTablesExist && !previousTablesDropped) {
            const newPrefixDisplay = newActiveConfig.tablesPrefix ?? "None";
            const shouldDropAndRecreateTarget = await Confirm.prompt({
              message:
                `Tables with the new configuration (Tables prefix: "${newPrefixDisplay}") already exist. Would you like to clear them and recreate them according to the new configuration?`,
              default: false,
            });
            console.log();

            if (shouldDropAndRecreateTarget) {
              console.log(
                colors.yellow(
                  `🗑️  Dropping existing ADM tables with prefix "${newPrefixDisplay}"...`,
                ),
              );
              await db.transaction(async (txCtx) => {
                for (
                  const ddl of [
                    newFokontanysDDL,
                    newCommunesDDL,
                    newDistrictsDDL,
                    newRegionsDDL,
                    newProvincesDDL,
                  ]
                ) {
                  await ddl.drop(txCtx);
                }
              }, DDL_TRANSACTION_OPTIONS);
              console.log();
              console.log(
                colors.green(`✅ Existing target tables dropped successfully.`),
              );
              console.log();
              shouldRecreateTargetTables = true;
            }
          } else if (!targetTablesExist) {
            shouldRecreateTargetTables = true;
          }

          if (shouldRecreateTargetTables) {
            console.log(
              colors.yellow(
                `🏗️  Creating new ADM tables with the active configuration...`,
              ),
            );
            await db.transaction(async (txCtx) => {
              for (
                const ddl of [
                  newProvincesDDL,
                  newRegionsDDL,
                  newDistrictsDDL,
                  newCommunesDDL,
                  newFokontanysDDL,
                ]
              ) {
                await ddl.create(txCtx);
              }
            });
            console.log();
            console.log(
              colors.bold.green(`✅ New ADM tables created successfully.`),
            );
            console.log();
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (db) {
        await db.close();
        console.log(
          colors.gray("🔌 Database connection closed successfully"),
        );
      }
    }
  }
}

let _command: CliManageConfigsCommand | null = null;

/**
 * Returns the singleton instance of {@link CliManageConfigsCommand},
 * creating it on first call.
 */
export function injectCliManageConfigsCommand(): CliManageConfigsCommand {
  if (!_command) _command = new CliManageConfigsCommand();
  return _command;
}
