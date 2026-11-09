const { createHash, randomBytes, scrypt: derive, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(derive);
const formato = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/;

async function proteger(clave) {
  const sal = randomBytes(16).toString('hex');
  const hash = await scrypt(clave, sal, 64);
  return 'scrypt$' + sal + '$' + hash.toString('hex');
}

async function comprobar(clave, guardada) {
  const partes = formato.exec(guardada || '');
  const hash = await scrypt(clave, partes?.[1] || '00000000000000000000000000000000', 64);
  return !!partes && timingSafeEqual(hash, Buffer.from(partes[2], 'hex'));
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

module.exports = { proteger, comprobar, hashToken };
