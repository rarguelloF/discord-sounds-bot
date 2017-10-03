const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');


const DEFAULT_SOUND_INFO = { description: '', category: 'Other' };

const pathExists = paramName => path => {
  if (!fs.existsSync(path)) {
    const err = `Invalid --${paramName} parameter: path: "${path}" does not exists`;
    throw new Error(err);
  }
  return path;
}

const errorIfMissing = (paramName, val) => {
  if (val === undefined) {
    const err = `Missing mandatory parameter: <${paramName}>.`;
    throw new Error(err);
  }
  return val;
}

const strToList = val => val.split(',');

const parseConfig = path => yaml.safeLoad(fs.readFileSync(path, 'utf8'));

const validateConfig = config => {
  [['token', config.token], ['client-id', config.clientId], ['sounds', config.sounds]]
    .forEach(([paramName, val]) => errorIfMissing(paramName, val));

  return config;
}

const mergeCliWithConfig = (cli, config) => (
  {
    ...config,
    ..._.omitBy(_.pick(cli, ['token', 'clientId', 'sounds', 'addAllowedUsers', 'deleteAllowedUsers']), _.isNil),
  }
);

function isUserAllowed(tag, allowedUsers) {
  if (allowedUsers.length === 0) {
    return true;
  }

  return allowedUsers.includes(tag);
}

function chunkString(str, len) {
  let _size = Math.ceil(str.length/len);
  let _ret = new Array(_size);
  let _offset;

  for (let _i=0; _i<_size; _i++) {
    _offset = _i * len;
    _ret[_i] = str.substring(_offset, _offset + len);
  }

  return _ret;
}

function parseSoundInfo(fname) {
  if (!fs.existsSync(fname)) {
    return DEFAULT_SOUND_INFO;
  }

  try {
    return {
      ...DEFAULT_SOUND_INFO,
      ...yaml.safeLoad(fs.readFileSync(fname, 'utf8')),
    };
  } catch (e) {
    console.error(`An error ocured parsing ${fname}`);
    console.error(e);
  }

  return DEFAULT_SOUND_INFO;
}

function getSoundLibrary(soundsPath) {
  const files = fs.readdirSync(soundsPath).map(f => path.join(soundsPath, f));

  return files
    .filter(fname => path.extname(fname) !== '.info')
    .reduce((acc, fname) => {
      const name = `${path.basename(fname, path.extname(fname))}`;
      const info = parseSoundInfo(path.join(soundsPath, `${name}.info`));

      return {
        ...acc,
        [name]: {
          name,
          path: fname,
          info: {
            ...info,
            category: info.category.toLowerCase().replace(' ', '-'),
          }
        }
      };
    }, {});
}

module.exports = {
  validateConfig,
  strToList,
  mergeCliWithConfig,
  pathExists,
  parseConfig,
  getSoundLibrary,
  chunkString,
  parseSoundInfo,
  isUserAllowed,
}
