import {
  type CommandsRegistry,
  registerCommand,
  runCommand,
} from "./commands/commands";
import {
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerListUsers,
} from "./commands/users";
import {
  handlerAggregate,
  handlerAddFeed,
  handlerListFeeds,
  handlerFollow,
  handlerListFeedFollows,
  handlerUnfollow,
} from "./commands/feeds";
import { middlewareLoggedIn } from "./middleware";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("usage: <command> [args...]");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);
  const commandsRegistry: CommandsRegistry = {};

  registerCommand(commandsRegistry, "login", handlerLogin);
  registerCommand(commandsRegistry, "register", handlerRegister);
  registerCommand(commandsRegistry, "reset", handlerReset);
  registerCommand(commandsRegistry, "users", handlerListUsers);
  registerCommand(commandsRegistry, "agg", handlerAggregate);
  registerCommand(
    commandsRegistry,
    "addfeed",
    middlewareLoggedIn(handlerAddFeed)
  );
  registerCommand(
    commandsRegistry,
    "follow",
    middlewareLoggedIn(handlerFollow)
  );
  registerCommand(
    commandsRegistry,
    "following",
    middlewareLoggedIn(handlerListFeedFollows)
  );
  registerCommand(
    commandsRegistry,
    "unfollow",
    middlewareLoggedIn(handlerUnfollow)
  );
  registerCommand(commandsRegistry, "feeds", handlerListFeeds);

  try {
    await runCommand(commandsRegistry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error running command ${cmdName}: ${err.message}`);
    } else {
      console.error(`Error running command ${cmdName}: ${err}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main();
