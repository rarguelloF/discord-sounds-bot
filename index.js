#!/usr/bin/env node

const cli = require('commander');
const utils = require('./src/utils');
const SoundsBot = require('./src/bot');

cli
  .version('0.1.0')
  .option('-t, --token <token>', 'Discord bot token.')
  .option('-i, --client-id <client-id>', 'Discord bot client ID.')
  .option('-s, --sounds <path>', 'Path to sounds folder.', utils.pathExists('sounds'))
  .option('-a, --add-allowed-users [users]', 'Comma separated list of discord users allowed to add sounds.', utils.strToList, [])
  .option('-d, --delete-allowed-users [users]', 'Comma separated list of discord users allowed to delete sounds.', utils.strToList, [])
  .option('-c, --config [path]', 'Path to config. Provided flags override config ones.', utils.parseConfig, {})
  .parse(process.argv);


const config = utils.validateConfig(utils.mergeCliWithConfig(cli, cli.config));
const bot = new SoundsBot(config);

bot.start();

const message = [
  'Use the following URL to let the bot join your server!',
  `https://discordapp.com/oauth2/authorize?client_id=${config.clientId}&scope=bot`
].join('\n');

console.log(message); // eslint-disable-line no-console
