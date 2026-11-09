const db = require('./db');
const { proteger } = require('./seguridad');

async function main() {
  const [rol, correo, nombre] = process.argv.slice(2);
  if (!['duena', 'empleado'].includes(rol) || !correo || correo.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || !nombre?.trim() || nombre.trim().length > 100) {
    throw new Error('Uso: node crear-usuario.js duena|empleado correo "Nombre"');
  }
  // La contraseña llega por stdin para mantenerla fuera de los argumentos del proceso.
  process.stdin.setEncoding('utf8');
  let clave = '';
  for await (const parte of process.stdin) {
    clave += parte;
    if (clave.length > 132) throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }
  clave = clave.replace(/\r?\n$/, '');
  if (clave.length < 12 || clave.length > 128) {
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }
  const resultado = await db.execute(
    'INSERT INTO usuarios (id_rol, nombre, correo, password_hash) SELECT id_rol, ?, ?, ? FROM roles WHERE id_rol = ?',
    [nombre.trim(), correo.toLowerCase(), await proteger(clave), rol === 'duena' ? 1 : 2]
  );
  if (!resultado[0].affectedRows) throw new Error('Primero importa el esquema y los roles.');
  console.log('Usuario creado.');
}

main().catch(error => {
  console.error(error.code === 'ER_DUP_ENTRY' ? 'El correo ya existe. El usuario anterior sigue activo con su configuración actual.' : error.message);
  process.exitCode = 1;
}).finally(() => db.end());
