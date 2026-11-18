import { colors } from "@cliffy/ansi/colors";
import { Command } from "@cliffy/command";
import { Confirm, Select } from "@cliffy/prompt";

import {
  MANAGE_CONFIGS_COMMAND_DESCRIPTION,
  MANAGE_CONFIGS_COMMAND_NAME,
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
  promptMadaAdmConfig,
  resolveCommonGlobalCliConfig,
} from "@scope/helpers/cli";
import { compareMadaAdmConfigValues } from "@scope/helpers/models";
import type { GlobalCliConfig } from "@scope/types/cli";
import type { DbConnection, DbTransactionContext } from "@scope/types/db";
import type {
  EntityId,
  MadaAdmConfig,
  MadaAdmConfigValues,
  Nullable,
} from "@scope/types/models";

/**
 * Supported post-input actions when confirmation, retry, or abort is requested.
 */
type PostInputAction = "confirm" | "retry" | "abort";

/**
 * Supported management action choices.
 */
type ManageConfigAction =
  | "create"
  | "update"
  | "switch"
  | "delete"
  | "clear"
  | "reset"
  | "quit";

/**
 * CLI sub-command that interactively manages Mada ADM configurations stored
 * in the database (creating, updating, switching active, or deleting), and
 * optionally rebuilds the ADM tables when the active configuration changes.
 */
export class CliManageConfigCommand extends Command<GlobalCliConfig, void> {
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
          await this.handleManageConfig(options);
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
   * Creates all ADM tables for the specified configuration in parent-to-child order.
   *
   * @param config - The Mada ADM configuration to create tables for.
   * @param dbType - The active database type.
   * @param db - The active database connection.
   * @param pgSchema - Optional PostgreSQL schema name.
   * @param txCtx - Optional transaction context.
   */
  private async createAdmTables(
    config: MadaAdmConfigValues,
    dbType: DbType,
    db: DbConnection,
    pgSchema?: string,
    txCtx?: DbTransactionContext,
  ): Promise<void> {
    const ddlOptions = pgSchema ? { pgSchema } : undefined;
    const provincesDDL = injectProvincesDDL(config, dbType, db, ddlOptions);
    const regionsDDL = injectRegionsDDL(config, dbType, db, ddlOptions);
    const districtsDDL = injectDistrictsDDL(config, dbType, db, ddlOptions);
    const communesDDL = injectCommunesDDL(config, dbType, db, ddlOptions);
    const fokontanysDDL = injectFokontanysDDL(config, dbType, db, ddlOptions);

    for (
      const ddl of [
        provincesDDL,
        regionsDDL,
        districtsDDL,
        communesDDL,
        fokontanysDDL,
      ]
    ) {
      console.log(`   Creating the ${ddl.tableName} table ...`);
      await ddl.create(txCtx);
    }

    resetProvincesDDL(dbType);
    resetRegionsDDL(dbType);
    resetDistrictsDDL(dbType);
    resetCommunesDDL(dbType);
    resetFokontanysDDL(dbType);
  }

  /**
   * Main handler: loops interactively to manage configurations, prompt for actions,
   * apply transactional changes, and manage ADM tables according to the flowchart.
   *
   * @param options - The globally resolved CLI configuration.
   */
  private async handleManageConfig(options: GlobalCliConfig): Promise<void> {
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

      let action: ManageConfigAction = "quit";

      do {
        const existingConfigs = await madaAdmConfigDML.getAll();
        const activeConfig: Nullable<MadaAdmConfig> =
          existingConfigs.find((c) => c.isActive) ?? null;
        const admTablesExist = activeConfig
          ? await this.checkAdmTablesExist(activeConfig, dbType, db, pgSchema)
          : false;
        let newConfig: MadaAdmConfigValues | MadaAdmConfig | null = null;
        let postInputAction: PostInputAction = "confirm";
        let forceDropExistingTables = false;
        let activateNewConfig = false;
        let doPostActionReset = true;

        if (existingConfigs.length === 0) {
          console.log(
            colors.yellow(
              "ℹ️  No existing ADM configuration found in the database.\n",
            ),
          );
        } else {
          console.log(
            colors.blue(
              `Found ${existingConfigs.length} existing Mada ADM configuration(s):\n`,
            ),
          );
          for (let i = 0; i < existingConfigs.length; i++) {
            const num = i + 1;
            const isActiveSuffix = existingConfigs[i].isActive
              ? " (Active) "
              : " ";
            displayMadaAdmConfig(
              `${num}.${isActiveSuffix}`,
              existingConfigs[i],
            );
            console.log();
          }
        }

        const configIdByChoiceNumber = new Map<number, EntityId>();
        for (let i = 0; i < existingConfigs.length; i++) {
          configIdByChoiceNumber.set(i + 1, existingConfigs[i].id);
        }

        const nonActiveConfigs = existingConfigs.filter((c) => !c.isActive);

        if (admTablesExist) {
          console.log(
            colors.blue(
              `The current ADM tables of active configuration were found in the database.`,
            ),
          );
        } else {
          console.log(
            colors.yellow(
              `ℹ️  No current ADM tables of the active configuration found in the database.`,
            ),
          );
        }
        console.log();

        const actionOptions: Record<"name" | "value", string>[] = [
          { name: "Create a new configuration", value: "create" },
        ];
        if (existingConfigs.length > 0) {
          actionOptions.push({
            name: "Update an existing configuration",
            value: "update",
          });
        }
        if (nonActiveConfigs.length > 0) {
          actionOptions.push({
            name: "Switch active configuration",
            value: "switch",
          });
        }
        if (existingConfigs.length > 0) {
          actionOptions.push({
            name: "Rebuild active ADM tables (reset)",
            value: "reset",
          });
        }
        if (existingConfigs.length > 1) {
          actionOptions.push({
            name: "Delete a configuration",
            value: "delete",
          });
        }
        if (existingConfigs.length > 0) {
          actionOptions.push({
            name: "Clear all configurations and tables",
            value: "clear",
          });
        }
        actionOptions.push({
          name: "Quit",
          value: "quit",
        });

        action = (await Select.prompt({
          message: "Choose ADM configuration management action:",
          options: actionOptions,
        })) as ManageConfigAction;
        console.log();

        switch (action) {
          case "create": {
            let duplicateConfig: MadaAdmConfig | null = null;

            while (true) {
              console.log(
                colors.yellow("ℹ️  Creating a new Mada ADM configuration:"),
              );
              const promptResult = await promptMadaAdmConfig();
              const rawTablesPrefix = (promptResult.tablesPrefix as string) ??
                "";
              const tablesPrefix = rawTablesPrefix.trim() || null;
              console.log();

              const candidateConfig: MadaAdmConfigValues = {
                tablesPrefix,
                isFkRepeated: promptResult.isFkRepeated as boolean,
                isProvinceRepeated: promptResult.isProvinceRepeated as boolean,
                isProvinceFkRepeated: promptResult
                  .isProvinceFkRepeated as boolean,
                hasGeojson: promptResult.hasGeojson as boolean,
                hasAdmLevel: promptResult.hasAdmLevel as boolean,
              };

              newConfig = candidateConfig;
              duplicateConfig = await madaAdmConfigDML.getExact(
                candidateConfig,
              );

              if (duplicateConfig) {
                console.log(
                  colors.yellow(
                    "⚠️  An identical configuration already exists. If confirmed, the existing configuration will be reused. Otherwise, retry with different settings or abort.\n",
                  ),
                );
                postInputAction = (await Select.prompt({
                  message: "Choose action for duplicate configuration:",
                  options: [
                    { name: "Confirm (reuse existing)", value: "confirm" },
                    { name: "Retry (input different config)", value: "retry" },
                    { name: "Abort", value: "abort" },
                  ],
                })) as PostInputAction;
                console.log();
              } else {
                postInputAction = "confirm";
              }

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Creation cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm" && newConfig) {
              const isDuplicateActive = duplicateConfig !== null &&
                activeConfig !== null &&
                duplicateConfig.id === activeConfig.id;

              if (duplicateConfig && isDuplicateActive) {
                console.log(
                  colors.yellow(
                    "ℹ️  This configuration is already active. No changes were made.\n",
                  ),
                );
                break;
              }

              if (
                admTablesExist &&
                activeConfig !== null &&
                activeConfig.tablesPrefix === newConfig.tablesPrefix
              ) {
                console.log(
                  colors.yellow(
                    "⚠️  Activating this configuration will drop the existing ADM tables and create new ones using the new settings.\n",
                  ),
                );
              }

              activateNewConfig = await Confirm.prompt({
                message: "Set as active configuration?",
                default: true,
              });
              console.log();

              await db.transaction(async (tCtx) => {
                if (activateNewConfig && activeConfig) {
                  await madaAdmConfigDML.deactivate(activeConfig.id, tCtx);
                }

                if (duplicateConfig) {
                  if (activateNewConfig) {
                    await madaAdmConfigDML.setActive(duplicateConfig.id);
                  }
                  newConfig = duplicateConfig;
                } else {
                  const inserted = await madaAdmConfigDML.insert(
                    newConfig as MadaAdmConfigValues,
                    activateNewConfig,
                    tCtx,
                  );
                  newConfig = inserted;
                }
              });

              console.log(
                colors.green.bold(
                  "✅ Configuration processed successfully.\n",
                ),
              );
              displayMadaAdmConfig("Mada ADM Configuration", newConfig);
              console.log();
            }
            break;
          }

          case "update": {
            let duplicateConfig: MadaAdmConfig | null = null;
            let updatedConfig!: MadaAdmConfig;

            while (true) {
              const chosenNumStr = await Select.prompt({
                message: "Select configuration to update:",
                options: existingConfigs.map((_, i) => String(i + 1)),
              });
              const targetConfigId = configIdByChoiceNumber.get(
                Number(chosenNumStr),
              )!;
              updatedConfig = existingConfigs.find(
                (c) => c.id === targetConfigId,
              )!;
              console.log();

              console.log(
                colors.yellow(
                  `ℹ️  Updating configuration #${chosenNumStr}:`,
                ),
              );
              const promptResult = await promptMadaAdmConfig(updatedConfig);
              const rawTablesPrefix = (promptResult.tablesPrefix as string) ??
                "";
              const tablesPrefix = rawTablesPrefix.trim() || null;
              console.log();

              const candidateConfig: MadaAdmConfigValues = {
                tablesPrefix,
                isFkRepeated: promptResult.isFkRepeated as boolean,
                isProvinceRepeated: promptResult.isProvinceRepeated as boolean,
                isProvinceFkRepeated: promptResult
                  .isProvinceFkRepeated as boolean,
                hasGeojson: promptResult.hasGeojson as boolean,
                hasAdmLevel: promptResult.hasAdmLevel as boolean,
              };

              newConfig = candidateConfig;

              if (compareMadaAdmConfigValues(candidateConfig, updatedConfig)) {
                console.log(
                  colors.yellow(
                    "⚠️  The provided configuration is identical to the one being updated. Please retry with different settings or abort.\n",
                  ),
                );
                postInputAction = (await Select.prompt({
                  message: "Choose action:",
                  options: [
                    { name: "Retry (input different values)", value: "retry" },
                    { name: "Abort", value: "abort" },
                  ],
                })) as PostInputAction;
                console.log();
              } else {
                duplicateConfig = await madaAdmConfigDML.getExact(
                  candidateConfig,
                );
                if (duplicateConfig) {
                  console.log(
                    colors.yellow(
                      "⚠️  An identical configuration already exists. If confirmed, that configuration will be reused and the current one will be deleted. Otherwise, retry with different settings or abort.\n",
                    ),
                  );
                  postInputAction = (await Select.prompt({
                    message: "Choose action for duplicate configuration:",
                    options: [
                      {
                        name: "Confirm (reuse duplicate and remove current)",
                        value: "confirm",
                      },
                      {
                        name: "Retry (input different values)",
                        value: "retry",
                      },
                      { name: "Abort", value: "abort" },
                    ],
                  })) as PostInputAction;
                } else if (admTablesExist) {
                  console.log(
                    colors.yellow(
                      "⚠️  If confirmed, the current ADM tables will be dropped and new ones will be created using the new settings. Otherwise, retry with different settings or abort.\n",
                    ),
                  );
                  postInputAction = (await Select.prompt({
                    message: "Choose action for overriding configuration:",
                    options: [
                      {
                        name:
                          "Confirm (drop current ADM tables and create new ones)",
                        value: "confirm",
                      },
                      {
                        name: "Retry (input different values)",
                        value: "retry",
                      },
                      { name: "Abort", value: "abort" },
                    ],
                  })) as PostInputAction;
                  forceDropExistingTables = true;
                }
                console.log();
              }

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Update cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm" && newConfig) {
              const shouldPromptActivation = (duplicateConfig === null &&
                !updatedConfig.isActive) ||
                (duplicateConfig !== null && !duplicateConfig.isActive);

              if (shouldPromptActivation) {
                if (
                  activeConfig !== null &&
                  activeConfig.tablesPrefix === newConfig.tablesPrefix
                ) {
                  console.log(
                    colors.yellow(
                      "⚠️  Activating this configuration will drop the existing ADM tables and create new ones using the new settings.\n",
                    ),
                  );
                }
                activateNewConfig = await Confirm.prompt({
                  message: "Set as active configuration?",
                  default: false,
                });
                console.log();
              }

              await db.transaction(async (tCtx) => {
                if (activateNewConfig && activeConfig) {
                  await madaAdmConfigDML.deactivate(activeConfig.id, tCtx);
                }

                if (duplicateConfig) {
                  if (activateNewConfig) {
                    await madaAdmConfigDML.setActive(duplicateConfig.id, tCtx);
                  }
                  await madaAdmConfigDML.delete(updatedConfig.id, tCtx);
                  newConfig = duplicateConfig;
                } else {
                  const updated = await madaAdmConfigDML.update(
                    updatedConfig.id,
                    {
                      ...newConfig,
                      isActive: activateNewConfig,
                    },
                    tCtx,
                  );
                  newConfig = updated;
                }
              });

              console.log(
                colors.green.bold(
                  "✅ Configuration updated successfully.\n",
                ),
              );
              displayMadaAdmConfig("Mada ADM Configuration", newConfig);
              console.log();
            }
            break;
          }

          case "switch": {
            let switchedConfig!: MadaAdmConfig;

            while (true) {
              const currentNonActive = existingConfigs.filter(
                (c) => !c.isActive,
              );
              const chosenNumStr = await Select.prompt({
                message: "Select an ADM configuration to activate:",
                options: currentNonActive.map((c) => {
                  const num = existingConfigs.indexOf(c) + 1;
                  return {
                    name: `#${num} (Tables prefix: ${
                      c.tablesPrefix !== null ? `"${c.tablesPrefix}"` : "None"
                    })`,
                    value: String(num),
                  };
                }),
              });
              const targetConfigId = configIdByChoiceNumber.get(
                Number(chosenNumStr),
              )!;
              switchedConfig = existingConfigs.find(
                (c) => c.id === targetConfigId,
              )!;
              console.log();

              if (
                admTablesExist &&
                activeConfig !== null &&
                switchedConfig.tablesPrefix === activeConfig.tablesPrefix
              ) {
                console.log(
                  colors.yellow(
                    "⚠️  Activating this configuration will drop the existing ADM tables and create new ones using the new settings.\n",
                  ),
                );
              }

              postInputAction = (await Select.prompt({
                message: "Choose action:",
                options: [
                  { name: "Confirm (activate selection)", value: "confirm" },
                  {
                    name: "Retry (pick another configuration)",
                    value: "retry",
                  },
                  { name: "Abort", value: "abort" },
                ],
              })) as PostInputAction;
              console.log();

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Switch cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm") {
              newConfig = switchedConfig;
              activateNewConfig = true;

              await db.transaction(async (tCtx) => {
                if (activeConfig) {
                  await madaAdmConfigDML.deactivate(activeConfig.id, tCtx);
                }
                await madaAdmConfigDML.setActive(switchedConfig.id, tCtx);
              });

              console.log(
                colors.green.bold(
                  "✅ Switched active configuration successfully.\n",
                ),
              );
              displayMadaAdmConfig(
                "Active Mada ADM Configuration",
                switchedConfig,
              );
              console.log();
            }
            break;
          }

          case "delete": {
            let deletedConfig!: MadaAdmConfig;
            let deletedConfigAdmTablesExist = false;

            while (true) {
              const chosenNumStr = await Select.prompt({
                message: "Select configuration to delete:",
                options: existingConfigs.map((_, i) => String(i + 1)),
              });
              const targetConfigId = configIdByChoiceNumber.get(
                Number(chosenNumStr),
              )!;
              deletedConfig = existingConfigs.find(
                (c) => c.id === targetConfigId,
              )!;
              console.log();

              if (deletedConfig.id === activeConfig?.id) {
                deletedConfigAdmTablesExist = await this.checkAdmTablesExist(
                  activeConfig,
                  dbType,
                  db,
                  pgSchema,
                );
              } else {
                deletedConfigAdmTablesExist = await this.checkAdmTablesExist(
                  deletedConfig,
                  dbType,
                  db,
                  pgSchema,
                );
              }

              if (deletedConfigAdmTablesExist) {
                console.log(
                  colors.yellow(
                    "⚠️  If confirmed, the ADM tables associated with the configuration to be deleted will be dropped. Otherwise, select another configuration or abort.\n",
                  ),
                );
                postInputAction = (await Select.prompt({
                  message: "Choose action:",
                  options: [
                    {
                      name: "Confirm (delete configuration)",
                      value: "confirm",
                    },
                    {
                      name: "Retry (choose another configuration)",
                      value: "retry",
                    },
                    { name: "Abort", value: "abort" },
                  ],
                })) as PostInputAction;
                console.log();
              } else {
                const confirmed = await Confirm.prompt({
                  message: `Delete configuration #${chosenNumStr}?`,
                  default: false,
                });
                console.log();
                postInputAction = confirmed ? "confirm" : "abort";
              }

              if (postInputAction !== "retry") {
                break;
              }
            }

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Deletion cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm") {
              let fallbackActiveConfig: MadaAdmConfig | null = null;
              const isDeletingActive = activeConfig !== null &&
                deletedConfig.id === activeConfig.id;

              if (isDeletingActive) {
                const remainingConfigs = existingConfigs.filter(
                  (c) => c.id !== deletedConfig.id,
                );
                if (remainingConfigs.length === 1) {
                  fallbackActiveConfig = remainingConfigs[0];
                  console.log(
                    colors.yellow(
                      "ℹ️  The active configuration was deleted. Automatically activating the only remaining configuration.\n",
                    ),
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
                }
              }

              await db.transaction(async (tCtx) => {
                await madaAdmConfigDML.delete(deletedConfig.id, tCtx);
                if (fallbackActiveConfig) {
                  await madaAdmConfigDML.setActive(
                    fallbackActiveConfig.id,
                    tCtx,
                  );
                }
              });

              await db.transaction(async (txCtx) => {
                const targetDropConfig =
                  deletedConfig.tablesPrefix !== activeConfig?.tablesPrefix &&
                    deletedConfigAdmTablesExist
                    ? deletedConfig
                    : (activeConfig ?? deletedConfig);

                console.log(
                  colors.yellow(
                    `🗑️  Dropping ADM tables for prefix ${
                      targetDropConfig.tablesPrefix
                        ? `"${targetDropConfig.tablesPrefix}"`
                        : "None"
                    } ...`,
                  ),
                );
                await this.dropAdmTables(
                  targetDropConfig,
                  dbType,
                  db,
                  pgSchema,
                  txCtx,
                );

                if (fallbackActiveConfig !== null) {
                  console.log(
                    colors.yellow(
                      `🏗️  Creating ADM tables for new active config (prefix: ${
                        fallbackActiveConfig.tablesPrefix
                          ? `"${fallbackActiveConfig.tablesPrefix}"`
                          : "None"
                      }) ...`,
                    ),
                  );
                  await this.createAdmTables(
                    fallbackActiveConfig,
                    dbType,
                    db,
                    pgSchema,
                    txCtx,
                  );
                }
              }, DDL_TRANSACTION_OPTIONS);

              doPostActionReset = false;
              console.log(
                colors.green.bold(
                  "✅ Configuration deleted and tables updated successfully.\n",
                ),
              );
            }
            break;
          }

          case "clear": {
            console.log(
              colors.red(
                "⚠️  If confirmed, all configuration records will be deleted and all associated ADM tables will be dropped. Otherwise, abort.\n",
              ),
            );
            postInputAction = (await Select.prompt({
              message: "Are you sure you want to clear everything?",
              options: [
                { name: "Confirm (clear all data)", value: "confirm" },
                { name: "Abort", value: "abort" },
              ],
            })) as PostInputAction;
            console.log();

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Clear cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm") {
              await madaAdmConfigDML.deleteAll();

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
                        `🗑️  Dropping ADM tables for config with prefix ${
                          existingConfig.tablesPrefix
                            ? `"${existingConfig.tablesPrefix}"`
                            : "None"
                        } ...`,
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

              doPostActionReset = false;
              console.log(
                colors.green.bold(
                  "✅ All ADM configurations and tables cleared successfully.\n",
                ),
              );
            }
            break;
          }

          case "reset": {
            if (!activeConfig) {
              console.log(
                colors.red(
                  "❌ No active configuration found. Please create or activate a configuration first.\n",
                ),
              );
              break;
            }

            console.log(
              colors.yellow(
                "⚠️  If confirmed, the ADM tables for the active configuration will be dropped and recreated. Otherwise, abort.\n",
              ),
            );
            postInputAction = (await Select.prompt({
              message: "Rebuild ADM tables for the active configuration?",
              options: [
                { name: "Confirm (rebuild tables)", value: "confirm" },
                { name: "Abort", value: "abort" },
              ],
            })) as PostInputAction;
            console.log();

            if (postInputAction === "abort") {
              console.log(colors.gray("ℹ️  Reset cancelled.\n"));
              break;
            }

            if (postInputAction === "confirm") {
              console.log(
                colors.yellow("🏗️  Rebuilding active ADM tables ..."),
              );
              await db.transaction(async (txCtx) => {
                await this.dropAdmTables(
                  activeConfig,
                  dbType,
                  db,
                  pgSchema,
                  txCtx,
                );
                await this.createAdmTables(
                  activeConfig,
                  dbType,
                  db,
                  pgSchema,
                  txCtx,
                );
              }, DDL_TRANSACTION_OPTIONS);

              doPostActionReset = false;
              console.log(
                colors.green.bold("✅ ADM tables rebuilt successfully.\n"),
              );
            }
            break;
          }

          case "quit": {
            console.log(colors.gray("👋 Exiting manage-config.\n"));
            break;
          }
        }

        // ── Common Post-Action Table Drop & Recreation ─────────────────────
        if (
          doPostActionReset &&
          postInputAction === "confirm" &&
          newConfig !== null
        ) {
          let dropExistingAdmTables = forceDropExistingTables;
          const prefixChanged = activateNewConfig &&
            activeConfig !== null &&
            newConfig.tablesPrefix !== activeConfig.tablesPrefix;

          if (admTablesExist && !forceDropExistingTables && prefixChanged) {
            const activePrefixDisplay = activeConfig.tablesPrefix ?? "None";
            dropExistingAdmTables = await Confirm.prompt({
              message:
                `Drop the ADM tables built with the previous active configuration (Tables prefix: "${activePrefixDisplay}")?`,
              default: false,
            });
            console.log();
          }

          await db.transaction(async (txCtx) => {
            if (dropExistingAdmTables && activeConfig !== null) {
              console.log(
                colors.yellow(
                  `🗑️  Dropping previous ADM tables with prefix ${
                    activeConfig.tablesPrefix
                      ? `"${activeConfig.tablesPrefix}"`
                      : "None"
                  } ...`,
                ),
              );
              await this.dropAdmTables(
                activeConfig,
                dbType,
                db,
                pgSchema,
                txCtx,
              );
            }

            if (activateNewConfig) {
              console.log(
                colors.yellow(
                  `🏗️  Creating new ADM tables with ${
                    newConfig?.tablesPrefix
                      ? `${newConfig?.tablesPrefix} prefix`
                      : "no prefix"
                  } ...`,
                ),
              );
              await this.createAdmTables(
                newConfig as MadaAdmConfigValues,
                dbType,
                db,
                pgSchema,
                txCtx,
              );

              console.log(
                colors.green.bold("✅ ADM tables updated successfully.\n"),
              );
            }
          }, DDL_TRANSACTION_OPTIONS);
        }
      } while (action !== "quit");
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

let _command: CliManageConfigCommand | null = null;

/**
 * Returns the singleton instance of {@link CliManageConfigCommand},
 * creating it on first call.
 */
export function injectCliManageConfigCommand(): CliManageConfigCommand {
  if (!_command) _command = new CliManageConfigCommand();
  return _command;
}
