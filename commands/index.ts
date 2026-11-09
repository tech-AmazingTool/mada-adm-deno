import {
  CLEAR_COMMAND_NAME,
  MANAGE_CONFIGS_COMMAND_NAME,
  QUERY_COMMAND_NAME,
  UPDATE_FIELD_COMMAND_NAME,
} from "@scope/consts/cli";

import { injectCliClearCommand } from "./clear.command.ts";
import { injectCliIndexCommand } from "./index.command.ts";
import { injectCliManageConfigsCommand } from "./manage-configs.command.ts";
import { injectCliQueryCommand } from "./query.command.ts";
import { injectCliUpdateFieldCommand } from "./update-field.command.ts";

const indexCommand = injectCliIndexCommand();
const updateFieldCommand = injectCliUpdateFieldCommand();
const manageConfigsCommand = injectCliManageConfigsCommand();
const clearCommand = injectCliClearCommand();
const queryCommand = injectCliQueryCommand();

indexCommand.command(UPDATE_FIELD_COMMAND_NAME, updateFieldCommand);
indexCommand.command(MANAGE_CONFIGS_COMMAND_NAME, manageConfigsCommand);
indexCommand.command(CLEAR_COMMAND_NAME, clearCommand);
indexCommand.command(QUERY_COMMAND_NAME, queryCommand);

await indexCommand.parse();
