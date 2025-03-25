import 'dotenv/config';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ACTIVE_COMMAND = {
  name: 'active',
  description: 'See if a player is in an active game',
  type: 1, // Command type: CHAT_INPUT (Slash Command)
  options: [
    {
      type: 3, // STRING type (ApplicationCommandOptionType.STRING)
      name: 'summonerName', // Must be lowercase, no spaces
      description: "The summoner's name",
      required: true
    },
    {
      type: 3, // STRING type (ApplicationCommandOptionType.STRING)
      name: 'summonerTag', // Must be lowercase, no spaces
      description: "The summoner's tag",
      required: true
    }
  ],
};

export default ACTIVE_COMMAND;




// Command containing options

const ALL_COMMANDS = [TEST_COMMAND, ACTIVE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
