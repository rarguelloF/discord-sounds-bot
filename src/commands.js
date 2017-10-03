const _ = require('lodash');
const utils = require('./utils');
const https = require('https');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');


function help() {
  return [
    '```',
    `Use the prefix "!" with the following commands:`,
    '',
    'sounds                       Show available sounds',
    '<sound>                      Play the specified sound',
    'random                       Play random sound',
    'stop                         Stop playing and clear queue',
    'add                          Add the attached sound',
    'set <sound> <param> <value>  Set <param> to <value> for that sound info',
    'rename <old> <new>           Rename specified sound',
    'remove <sound>               Remove specified sound',
    'help                         Show this message',
    '```'
  ].join('\n');
}


function sounds(soundsLib, category=null) {
  const soundsByCategory = category ?
    _.pick(_.groupBy(soundsLib, 'info.category'), category.toLowerCase()) :
    _.groupBy(soundsLib, 'info.category');

  const fullMsg = Object.keys(soundsByCategory)
    .reduce((acc, category) => {
      const soundsList = soundsByCategory[category]
        .map(sound => `!${sound.name}${sound.info.description ? `: ${sound.info.description}` : ''}`)
        .join("\n- ");

      const msg = [
        '',
        category.toUpperCase().replace('-', ' '),
        '---------------',
        `- ${soundsList}`,
        '---------------',
        '',
      ].join('\n');

      return acc + msg;
    }, '');

  return utils.chunkString(fullMsg, 2000 - 6)
    .map(msg => `${"```"}${msg}${"```"}`);
}

function random(soundsLib, category=null) {
  const sounds = (() => {
    if (!category) {
      return Object.keys(soundsLib);
    }

    const categorySounds = _.groupBy(soundsLib, 'info.category')[category.toLowerCase()];

    return categorySounds ? categorySounds.map(obj => obj.name) : [];
  })();

  if (sounds.length === 0) {
    return null;
  }

  const random = sounds[Math.floor(Math.random() * sounds.length)];
  return soundsLib[random];
}

function add(attachments, soundsPath, soundLib, channel, sizeLimit=1000000, extensions=[]) {
  attachments.forEach(attachment => {
    const soundName = `${path.basename(attachment.filename, path.extname(attachment.filename))}`;

    if (soundLib[soundName]) {
      channel.send(`Sound \`${soundName}\` already exists!`);
      return;
    }

    if (attachment.filesize > sizeLimit) {
      channel.send(`\`${attachment.filename.split('.')[0]}\` is too big!`);
      return;
    }

    if (extensions && extensions.some(ext => attachment.filename.endsWith(ext))) {
      channel.send('Sound has to be in accepted format!');
      return;
    }

    https.get(attachment.url, response => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(path.join(soundsPath, path.basename(attachment.filename.toLowerCase())));
        response.pipe(file);
        channel.send(`File \`${attachment.filename}\` added succesfully!`);
      }
    }).on('error', () => {
      channel.send(`Something went wrong adding \`${attachment.filename}\`!`);
    })
  });
}

function rename(source, dest, soundsPath, soundLib, channel) {
  const oldName = path.basename(source);
  const newName = path.basename(dest);

  if (!soundLib[oldName]) {
    channel.send(`Sound \`${oldName}\` does not exist!`);
    return;
  }

  if (soundLib[newName]) {
    channel.send(`Sound \`${newName}\` already exists. Delete it first!`);
    return;
  }

  const oldPath = soundLib[oldName].path;
  const newPath = path.join(path.dirname(oldPath), newName + path.extname(oldPath));

  fs.renameSync(oldPath, newPath);

  const oldInfoPath = path.join(path.dirname(oldPath), soundLib[oldName].name + '.info');
  const newInfoPath = path.join(path.dirname(newPath), newName + '.info');

  if (fs.existsSync(oldInfoPath)) fs.renameSync(oldInfoPath, newInfoPath);

  channel.send(`Sound \`${oldName}\` renamed to \`${newName}\` succesfully!`);
}

function remove(sound, soundsPath, soundLib, channel) {
  const soundName = path.basename(sound);

  if (!soundLib[soundName]) {
    channel.send(`Sound \`"${soundName}"\` does not exist!`);
    return;
  }

  const soundPath = soundLib[soundName].path;
  const soundInfoPath = path.join(path.dirname(soundPath), soundLib[soundName].name + '.info');

  if (fs.existsSync(soundPath)) fs.unlinkSync(soundPath);
  if (fs.existsSync(soundInfoPath)) fs.unlinkSync(soundInfoPath);

  channel.send(`Sound \`${soundName}\` removed succesfully!`);
}

function set(sound, param, value, soundsPath, soundLib, channel) {
  const validParams = ['category', 'description'];

  if (!['category', 'description'].includes(param)) {
    channel.send(`\`"${param}"\` is not a valid parameter! Choose from: ${validParams.join(', ')}`);
    return;
  }

  const data = { [param]: param === 'category' ? value.replace(' ', '-') : value };
  const soundName = path.basename(sound);

  if (!soundLib[soundName]) {
    channel.send(`Sound \`"${soundName}"\` does not exist!`);
    return;
  }

  const soundPath = soundLib[soundName].path;
  const soundInfoPath = path.join(path.dirname(soundPath), soundLib[soundName].name + '.info');

  if (fs.existsSync(soundInfoPath)) {
    const prevInfo = utils.parseSoundInfo(soundInfoPath);
    const newInfo = {
      ...prevInfo,
      ...data,
    };

    fs.writeFileSync(soundInfoPath, yaml.safeDump(newInfo));
  } else {
    fs.writeFileSync(soundInfoPath, yaml.safeDump(data));
  }

  channel.send(`Sound \`${soundName}\`'s  ${param} updated succesfully!`);
}

module.exports = {
  help,
  sounds,
  random,
  add,
  rename,
  remove,
  set,
}
