const Discord = require('discord.js');
const commands = require('./commands');
const utils = require('./utils');


class SoundsBot extends Discord.Client {
  constructor(config) {
    super();

    this.config = {
      prefix: '!',
      deleteMessages: false,
      ...config,
      users: {
        add: [],
        remove: [],
        rename: [],
        set: [],
        ignore: [],
        ...(config.users || {}),
      },
    }

    this.queue = [];

    this.on('ready', () => null);
    this.on('message', this.messageListener);
  }

  messageListener(message) {
    if (message.channel instanceof Discord.DMChannel) return; // Abort when DM
    if (!message.content.startsWith(this.config.prefix)) return; // Abort when not prefix
    if (this.config.users.ignore.includes(message.author.tag)) return;

    message.content = message.content.substring(this.config.prefix.length);
    this.handle(message);
  }

  start() {
    this.login(this.config.token);
  }

  handle(message) {
    const [command, ...input] = message.content.split(' ');

    switch (command) {
      case 'help': {
        return message.author.send(commands.help());
      }
      case 'sounds': {
        const soundsLib = utils.getSoundLibrary(this.config.sounds);
        const category = input.join('-');
        const responses = commands.sounds(soundsLib, category);

        return message.author.createDM()
          .then(channel => responses.forEach(
            resp => channel.send(resp)
              .catch(console.error)
          ));
      }
      case 'add':
        if (message.attachments) {
          const userAllowed = utils.isUserAllowed(message.author.tag, this.config.users.add);

          if (userAllowed) {
            const soundsLib = utils.getSoundLibrary(this.config.sounds);
            commands.add(message.attachments, this.config.sounds, soundsLib, message.channel);
          } else {
            message.reply('You are not allowed to add files, sorry :(');
          }
        }
        break;
      case 'set': {
        const userAllowed = utils.isUserAllowed(message.author.tag, this.config.users.set);
        const [sound, param, ...value] = input;

        if (!sound || !param || value.length === 0) {
          message.reply('Wrong number of parameters. Usage: !set <sound> <param> <value>');
          return;
        }

        if (userAllowed) {
          const soundsLib = utils.getSoundLibrary(this.config.sounds);

          commands.set(
            sound.toLowerCase(),
            param.toLowerCase(),
            value.join(' '),
            this.config.sounds,
            soundsLib,
            message.channel
          );
        } else {
          message.reply('You are not allowed to add files, sorry :(');
        }

        return;
      }
      case 'rename': {
        const soundsLib = utils.getSoundLibrary(this.config.sounds);
        const userAllowed = utils.isUserAllowed(message.author.tag, this.config.users.rename);

        const [source, dest, ..._remains] = input;

        if (!source || !dest) {
          message.reply('Usage: !rename <source> <dest>');
          return;
        }

        if (userAllowed) {
          commands.rename(source, dest, this.config.sounds, soundsLib, message.channel);
        } else {
          message.reply('You are not allowed to rename files, sorry :(');
        }
        break;
      }
      case 'remove': {
        const soundsLib = utils.getSoundLibrary(this.config.sounds);
        const userAllowed = utils.isUserAllowed(message.author.tag, this.config.users.remove);
        const [sound, ..._remains] = input;

        if (!sound) {
          message.reply('Usage: !remove <sound>');
          return;
        }

        if (userAllowed) {
          commands.remove(sound, this.config.sounds, soundsLib, message.channel)
        } else {
          message.reply('You are not allowed to remove files, sorry :(');
        }
        break;
      }
      default: {
        return this.handleSoundCommands(message);
      }
    }
  }

  handleSoundCommands(message) {
    const [command, ...input] = message.content.split(' ');

    const soundsLib = utils.getSoundLibrary(this.config.sounds);
    const voiceChannel = message.member.voiceChannel;

    if (voiceChannel === undefined) {
      message.reply('Join a voice channel first!');
      return;
    }

    switch (command) {
      case 'stop': {
        voiceChannel.leave();
        this.queue = [];
        break;
      }
      case 'random': {
        const category = input.join('-');
        const sound = commands.random(soundsLib, category);

        if (sound) {
          this.addToQueue(sound.name, sound.path, voiceChannel.id, message);
          if (!this._currentlyPlaying()) this.playSoundQueue();
        }
        break;
      }
      default: {
        const sound = soundsLib[command];
        if (sound) {
          this.addToQueue(sound.name, sound.path, voiceChannel.id, message);
          if (!this._currentlyPlaying()) this.playSoundQueue();
        }
        break;
      }
    }
  }

  addToQueue(name, path, channel, message) {
    this.queue.push({ name, path, channel, message });
  }

  _currentlyPlaying() {
    return this.voiceConnections.array().length > 0;
  }

  playSoundQueue() {
    const nextSound = this.queue.shift();
    const soundFile = nextSound.path;
    const voiceChannel = this.channels.get(nextSound.channel);

    voiceChannel.join().then((connection) => {
      const dispatcher = connection.playFile(soundFile);
      dispatcher.on('end', () => {
        if (this.config.deleteMessages === true) nextSound.message.delete();

        if (this.queue.length === 0) {
          connection.disconnect();
          return;
        }

        this.playSoundQueue();
      });
    }).catch((error) => {
      console.error('Error occured!');
      console.error(error);
    });
  }
}

module.exports = SoundsBot;
