const SEED = String(require('./query').seed || '2');
const seedRandom = require('seed-random');
const SimplexNoise = require('simplex-noise');

module.exports.random = seedRandom(SEED);
module.exports.simplex = new SimplexNoise(module.exports.random);

module.exports.randomSign = () => module.exports.random() > 0.5 ? 1 : -1;

module.exports.randomFloat = function (min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new TypeError('Expected all arguments to be numbers');
  }

  return module.exports.random() * (max - min) + min;
};

module.exports.randomCircle = function (out, scale) {
  scale = scale || 1.0;
  var r = module.exports.random() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
};

module.exports.randomSphere = function (out, scale) {
  scale = scale || 1.0;
  var r = module.exports.random() * 2.0 * Math.PI;
  var z = (module.exports.random() * 2.0) - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
};

module.exports.shuffle = function (arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('Expected Array, got ' + typeof arr);
  }

  var rand;
  var tmp;
  var len = arr.length;
  var ret = arr.slice();

  while (len) {
    rand = Math.floor(module.exports.random() * len--);
    tmp = ret[len];
    ret[len] = ret[rand];
    ret[rand] = tmp;
  }

  return ret;
};
