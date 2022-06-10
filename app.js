import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
  dotenv.config();

import {REST} from '@discordjs/rest';
import {Routes, GatewayIntentBits} from 'discord-api-types/v10';
import DiscordJS from 'discord.js';
import * as watcher from './watcher.js';
import {logger, DATA_PATH} from './logger.js';
import {LowSync, JSONFileSync} from 'lowdb';
import lodash from 'lodash';

const db = new LowSync(new JSONFileSync(`${DATA_PATH}/db.json`));
db.read();
db.data.channels ||= [];
db.write();

const commands = [
  {
    name: 'add',
    description: 'Add an EVGA product.',
    description_localizations: {
      "zh-TW": "新增一個 EVGA 產品"
    },
    options: [{
      name: 'url',
      description: 'The web url of EVGA product',
      required: true,
      type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
    }]
  },
  {
    name: 'ls',
    description: 'List all tracking EVGA product urls.',
  },
  {
    name: 'del',
    description: 'Delete a tracking EVGA product url.',
    options: [{
      name: 'id',
      description: 'A product id in tracking list',
      required: true,
      type: DiscordJS.Constants.ApplicationCommandOptionTypes.NUMBER
    }]
  },
  {
    name: 'tg',
    description: 'Toggle notification for this channel',
  },
  {
    name: 'tgm',
    description: 'Toggle notification for a product',
    options: [{
      name: 'id',
      description: 'A product id in tracking list',
      required: true,
      type: DiscordJS.Constants.ApplicationCommandOptionTypes.NUMBER
    }]
  },
];

const rest = new REST({version: '10'}).setToken(process.env.TOKEN);

(async () => {
  try {
    logger.info('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {body: commands});

    logger.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(error);
  }
})();

const client = new DiscordJS.Client({intents: [GatewayIntentBits.Guilds]});

client.on('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
  watcher.init(notify);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const {commandName, options, channel, user} = interaction;

  if (commandName === 'tg') {
    db.read();
    db.chain = lodash.chain(db.data);
    if (db.chain.get('channels').find({
      id: channel.id
    }).value()) {
      db.chain.get('channels').remove({
        id: channel.id
      }).value();
      await interaction.reply(`Notification for ${channel} is now off.`);
    }
    else {
      db.data.channels.push({id: channel.id});
      await interaction.reply(`Notification for ${channel} is now on.`);
    }
    db.write();
  }

  if (commandName === 'tgm') {
    db.read();
    db.chain = lodash.chain(db.data);
    let product = db.chain.get('products').find({
      id: options.getNumber('id')
    });
    if (product.value()) {
      if (product.get('users').value().map(u => u.id).includes(user.id)) {
        product.get('users').remove({
          id: user.id
        }).value();
        await interaction.reply(`Notification for ${product.value().name} is now off.`);
      }
      else {
        product.get('users').push({id: user.id}).value();
        await interaction.reply(`Notification for ${product.value().name} is now on.`);
      }
    }
    else
      await interaction.reply(`Product dosen\'t exist.`);
    db.write();
  }

  if (commandName === 'ls') {
    await interaction.reply(watcher.list_products());
  }

  if (commandName === 'add') {
    try {
      await interaction.deferReply();
      await watcher.add_product(options.getString('url'), user);
      await interaction.editReply(watcher.list_products());
    } catch (error) {
      logger.error(error);
      await interaction.editReply(error.message);
    }
  }

  if (commandName === 'del') {
    try {
      await watcher.del_product(options.getNumber('id'));
      await interaction.reply(watcher.list_products());
    } catch (error) {
      logger.error(error);
      await interaction.reply(error.message);
    }
  }
});

client.login(process.env.TOKEN);

function notify(product) {
  try {
    db.read();
    for (const channel of db.data.channels) {
      let mentions = product.users.map(user => `<@${user.id}>`).join(', ');
      client.channels.cache.get(channel.id).send(`${mentions}\n${product.name} 可以購買了!!\n${product.url}`);
    }
  } catch (error) {
    logger.error(error);
  }
}