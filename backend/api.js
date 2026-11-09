const { Router } = require('express');
const { randomBytes, randomUUID } = require('node:crypto');
const { comprobar, hashToken } = require('./seguridad');

class Problema extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

function texto(valor, etiqueta, max, opcional = false) {
  if (typeof valor !== 'string' || valor.trim().length > max || (!opcional && !valor.trim())) {
    throw new Problema(400, etiqueta + ' debe tener ' + (opcional ? 'hasta ' : 'entre 1 y ') + max + ' caracteres.');
  }
  return valor.trim();
}

function cantidad(valor, etiqueta, cero = false) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < (cero ? 0 : 0.01) || valor > 99999999.99 ||
      Math.abs(valor * 100 - Math.round(valor * 100)) > 0.00001) {
    throw new Problema(400, etiqueta + ' debe ser válida y tener hasta dos decimales.');
  }
  return valor.toFixed(2);
}

function id(valor) {
  const numero = Number(valor);
  if (!/^\d+$/.test(String(valor)) || !Number.isSafeInteger(numero) || numero < 1 || numero > 2147483647) {
    throw new Problema(400, 'Identificador inválido.');
  }
  return numero;
}

function fechaLocal() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Monterrey', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const porTipo = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return porTipo.year + '-' + porTipo.month + '-' + porTipo.day;
}

function fechaOperacion(valor) {
  const fecha = new Date(valor);
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < '1000-01-01' ||
      !Number.isFinite(+fecha) || fecha.toISOString().slice(0, 10) !== valor || valor > fechaLocal()) {
    throw new Problema(400, 'Selecciona una fecha válida hasta el día de hoy.');
  }
  return valor;
}

function solicitud(valor) {
  if (typeof valor !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(valor)) {
    throw new Problema(400, 'Identificador de solicitud inválido.');
  }
  return valor;
}

async function transaccion(db, operar) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await operar(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function bloquearProducto(conn, productoId) {
  const [[producto]] = await conn.execute(
    'SELECT stock_actual, unidad_medida FROM productos WHERE id_producto = ? FOR UPDATE', [productoId]);
  const [[archivado]] = await conn.execute(
    'SELECT id_producto FROM productos_archivados WHERE id_producto = ? FOR UPDATE', [productoId]);
  if (!producto || archivado) throw new Problema(404, 'Producto no disponible.');
  return producto;
}

async function movimiento(conn, sesion, datos, unidad) {
  const [registro] = await conn.execute(
    'INSERT INTO movimientos_inventario (id_producto,id_usuario,tipo_movimiento,cantidad,fecha_movimiento,observaciones) VALUES (?,?,?,?,UTC_TIMESTAMP(),?)',
    [datos.productoId, sesion.idUsuario, datos.tipo === 'entrada' ? 'Entrada' : 'Salida', datos.cantidad, datos.observaciones]);
  await conn.execute('INSERT INTO movimientos_detalle VALUES (?,?,?,?,?,?)',
    [registro.insertId, sesion.turnoId, datos.solicitud, datos.fecha, datos.detalle, unidad]);
}

async function registrar(db, sesion, body, merma) {
  const datos = {
    productoId: id(body.productoId),
    cantidad: cantidad(body.cantidad, 'La cantidad'),
    solicitud: solicitud(body.solicitud),
    fecha: fechaOperacion(body.fecha),
    detalle: texto(body.detalle, merma ? 'El tipo de baja' : 'El proveedor o motivo', 150),
    observaciones: texto(body.observaciones ?? '', 'Las observaciones', 250, true),
    tipo: merma ? 'merma' : body.tipo
  };
  if (merma ? !['Caducidad','Daño','Otros'].includes(datos.detalle) : !['entrada','salida'].includes(datos.tipo)) {
    throw new Problema(400, 'Tipo inválido.');
  }
  await transaccion(db, async conn => {
    // Todas las operaciones sobre existencias bloquean primero la misma fila del producto.
    const producto = await bloquearProducto(conn, datos.productoId);
    const sqlPrevio = merma
      ? `SELECT m.id_producto, d.id_sesion, m.cantidad, d.fecha_operacion, m.motivo AS detalle,
                d.descripcion AS observaciones, 'merma' AS tipo
           FROM mermas_detalle d JOIN mermas m USING (id_merma) WHERE d.id_solicitud=?`
      : `SELECT m.id_producto, d.id_sesion, m.cantidad, d.fecha_operacion, d.detalle, m.observaciones,
                LOWER(m.tipo_movimiento) AS tipo
           FROM movimientos_detalle d JOIN movimientos_inventario m USING (id_movimiento) WHERE d.id_solicitud=?`;
    const [[previo]] = await conn.execute(sqlPrevio, [datos.solicitud]);
    if (previo) {
      if (previo.id_producto !== datos.productoId || previo.id_sesion !== sesion.turnoId ||
          previo.cantidad !== datos.cantidad || previo.fecha_operacion !== datos.fecha ||
          previo.detalle !== datos.detalle || previo.observaciones !== datos.observaciones || previo.tipo !== datos.tipo) {
        throw new Problema(409, 'La solicitud ya corresponde a otro registro.');
      }
      return;
    }
    const entrada = datos.tipo === 'entrada';
    if (!entrada && Number(datos.cantidad) > Number(producto.stock_actual)) {
      throw new Problema(409, 'Stock insuficiente. Disponible: ' + producto.stock_actual + ' ' + producto.unidad_medida + '.');
    }
    if (entrada && Math.round(Number(producto.stock_actual) * 100) + Math.round(Number(datos.cantidad) * 100) > 9999999999) {
      throw new Problema(409, 'La entrada supera el stock máximo admitido.');
    }
    await conn.execute('UPDATE productos SET stock_actual = stock_actual + CAST(? AS DECIMAL(10,2)) WHERE id_producto=?',
      [entrada ? datos.cantidad : '-' + datos.cantidad, datos.productoId]);
    if (merma) {
      const [registro] = await conn.execute(
        'INSERT INTO mermas (id_producto,id_usuario,cantidad,motivo,fecha_registro) VALUES (?,?,?,?,UTC_TIMESTAMP())',
        [datos.productoId, sesion.idUsuario, datos.cantidad, datos.detalle]);
      await conn.execute('INSERT INTO mermas_detalle VALUES (?,?,?,?,?,?)',
        [registro.insertId, sesion.turnoId, datos.solicitud, datos.fecha, datos.observaciones, producto.unidad_medida]);
    } else {
      await movimiento(conn, sesion, datos, producto.unidad_medida);
    }
  });
  return { tipo: datos.tipo };
}

function createApi(db, secureCookies) {
  const api = Router();
  const cookie = { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/api' };
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST','PUT','DELETE'].includes(req.method) &&
        (!req.is('application/json') || ['cross-site','same-site'].includes(req.get('Sec-Fetch-Site')))) {
      throw new Problema(415, 'Solicitud no autorizada desde este origen o formato.');
    }
    next();
  });
  api.post('/login', async (req, res) => {
    const identificador = texto(req.body?.usuario, 'El usuario', 100).toLowerCase();
    const clave = req.body?.contrasena;
    if (typeof clave !== 'string' || !clave || clave.length > 128) throw new Problema(400, 'Contraseña inválida.');
    const [[usuario]] = await db.execute(
      'SELECT id_usuario, id_rol, nombre, password_hash FROM usuarios WHERE correo=? AND activo=1 AND id_rol IN (1,2)', [identificador]);
    if (!await comprobar(clave, usuario?.password_hash) || !usuario) throw new Problema(401, 'Correo o contraseña incorrectos.');
    const token = randomBytes(32).toString('hex');
    const turnoId = randomUUID();
    await db.execute('INSERT INTO sesiones (id_sesion, token_hash, id_usuario, inicio, vence) VALUES (?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP() + INTERVAL 8 HOUR)',
      [turnoId, hashToken(token), usuario.id_usuario]);
    res.cookie('imperio', token, { ...cookie, maxAge: 8 * 60 * 60 * 1000 }).json({ ok: true });
  });
  api.use(async (req, _res, next) => {
    const token = /(?:^|;\s*)imperio=([0-9a-f]{64})(?:;|$)/.exec(req.get('Cookie') || '')?.[1];
    if (!token) throw new Problema(401, 'Inicia sesión para continuar.');
    const [[sesion]] = await db.execute(`SELECT s.id_sesion AS turnoId, s.inicio AS inicioTurno,
      u.nombre AS usuario, u.id_usuario AS idUsuario, IF(u.id_rol=1,'duena','empleado') AS rol
      FROM sesiones s JOIN usuarios u USING (id_usuario) WHERE s.token_hash=? AND s.fin IS NULL
      AND s.vence > UTC_TIMESTAMP() AND u.activo=1 AND u.id_rol IN (1,2)`, [hashToken(token)]);
    if (!sesion) throw new Problema(401, 'Tu sesión terminó. Vuelve a iniciar sesión.');
    req.sesion = sesion;
    next();
  });
  function exigirDuena(req, _res, next) {
    if (req.sesion.rol !== 'duena') throw new Problema(403, 'Esta acción requiere el rol Dueña.');
    next();
  }
  api.get('/sesion', (req, res) => res.json(req.sesion));
  api.post('/logout', async (req, res) => {
    await db.execute('UPDATE sesiones SET fin=UTC_TIMESTAMP() WHERE id_sesion=?', [req.sesion.turnoId]);
    res.clearCookie('imperio', cookie).json({ ok: true });
  });
  api.get('/inventario', async (_req, res) => {
    const [productos] = await db.execute(`SELECT CAST(p.id_producto AS CHAR) AS id, p.nombre, c.nombre AS categoria,
      c.id_categoria AS categoriaId, p.unidad_medida AS unidad, p.stock_actual AS stock, p.stock_minimo AS minimo
      FROM productos p JOIN categorias c USING (id_categoria) LEFT JOIN productos_archivados a USING (id_producto)
      WHERE a.id_producto IS NULL ORDER BY p.nombre, p.id_producto`);
    const [categorias] = await db.execute('SELECT id_categoria AS id, nombre FROM categorias ORDER BY nombre');
    res.json({ productos: productos.map(p => ({...p, stock: Number(p.stock), minimo: Number(p.minimo)})), categorias });
  });
  async function guardarProducto(req, res) {
    const nombre = texto(req.body?.nombre, 'El nombre', 100);
    const unidad = texto(req.body?.unidad, 'La unidad', 20);
    const categoria = id(req.body?.categoriaId);
    const minimo = cantidad(req.body?.minimo, 'El stock mínimo', true);
    const productoId = req.params.id ? id(req.params.id) : null;
    await transaccion(db, async conn => {
      const [[existe]] = await conn.execute('SELECT id_categoria FROM categorias WHERE id_categoria=?', [categoria]);
      if (!existe) throw new Problema(400, 'Selecciona una categoría existente.');
      if (productoId) {
        const producto = await bloquearProducto(conn, productoId);
        if (Number(producto.stock_actual) && producto.unidad_medida !== unidad) {
          throw new Problema(409, 'Solo se puede cambiar la unidad cuando el stock es cero.');
        }
        await conn.execute('UPDATE productos SET nombre=?, id_categoria=?, unidad_medida=?, stock_minimo=? WHERE id_producto=?',
          [nombre, categoria, unidad, minimo, productoId]);
      } else {
        const stock = cantidad(req.body?.stock, 'El stock inicial', true);
        const [registro] = await conn.execute(
          'INSERT INTO productos (nombre,id_categoria,unidad_medida,stock_actual,stock_minimo) VALUES (?,?,?,?,?)',
          [nombre, categoria, unidad, stock, minimo]);
        if (Number(stock)) await movimiento(conn, req.sesion, {
          productoId: registro.insertId, cantidad: stock, tipo: 'entrada', solicitud: randomUUID(),
          fecha: fechaLocal(), detalle: 'Stock inicial', observaciones: ''
        }, unidad);
      }
    });
    res.status(productoId ? 200 : 201).json({ ok: true });
  }
  api.post('/productos', exigirDuena, guardarProducto);
  api.put('/productos/:id', exigirDuena, guardarProducto);
  api.delete('/productos/:id', exigirDuena, async (req, res) => {
    const productoId = id(req.params.id);
    await transaccion(db, async conn => {
      const producto = await bloquearProducto(conn, productoId);
      if (Number(producto.stock_actual)) throw new Problema(409, 'Registra la salida del stock antes de archivar el producto.');
      await conn.execute('INSERT INTO productos_archivados VALUES (?)', [productoId]);
    });
    res.json({ ok: true });
  });
  api.get('/movimientos', async (req, res) => {
    const [movimientos] = await db.execute(`SELECT LOWER(m.tipo_movimiento) AS tipo, p.nombre AS producto,
      m.cantidad, d.unidad, d.detalle, u.nombre AS usuario, d.fecha_operacion AS fecha,
      m.fecha_movimiento AS registradoEn, m.observaciones, d.id_sesion AS turnoId
      FROM movimientos_inventario m JOIN movimientos_detalle d USING (id_movimiento)
      JOIN productos p USING (id_producto) JOIN usuarios u USING (id_usuario)
      WHERE d.id_sesion=? ORDER BY m.id_movimiento DESC LIMIT 100`, [req.sesion.turnoId]);
    res.json(movimientos.map(m => ({...m, cantidad: Number(m.cantidad)})));
  });
  api.post('/movimientos', async (req, res) => res.status(201).json(await registrar(db, req.sesion, req.body || {}, false)));
  api.get('/mermas', exigirDuena, async (_req, res) => {
    const mes = fechaLocal().slice(0,7) + '-01';
    const [mermas] = await db.execute(`SELECT p.nombre AS producto, m.cantidad, COALESCE(d.unidad,p.unidad_medida) AS unidad,
      m.motivo AS tipo, COALESCE(d.fecha_operacion,DATE(m.fecha_registro)) AS fecha, d.descripcion
      FROM mermas m JOIN productos p USING (id_producto) LEFT JOIN mermas_detalle d USING (id_merma)
      ORDER BY m.id_merma DESC LIMIT 100`);
    const [resumen] = await db.execute(`SELECT m.motivo AS tipo, COUNT(*) AS total
      FROM mermas m LEFT JOIN mermas_detalle d USING (id_merma)
      WHERE COALESCE(d.fecha_operacion,DATE(m.fecha_registro)) >= ?
        AND COALESCE(d.fecha_operacion,DATE(m.fecha_registro)) < DATE_ADD(?, INTERVAL 1 MONTH)
      GROUP BY m.motivo`, [mes, mes]);
    res.json({mermas, resumen});
  });
  api.post('/mermas', async (req, res) => res.status(201).json(await registrar(db, req.sesion, req.body || {}, true)));
  api.get('/actividad-turno', async (req, res) => {
    const [movimientos] = await db.execute(`SELECT LOWER(m.tipo_movimiento) AS tipo, COUNT(*) AS total
      FROM movimientos_inventario m JOIN movimientos_detalle d USING (id_movimiento) WHERE d.id_sesion=? GROUP BY m.tipo_movimiento`, [req.sesion.turnoId]);
    const [[mermas]] = await db.execute('SELECT COUNT(*) AS total FROM mermas_detalle WHERE id_sesion=?', [req.sesion.turnoId]);
    res.json({ entradas: Number(movimientos.find(m => m.tipo === 'entrada')?.total || 0),
      salidas: Number(movimientos.find(m => m.tipo === 'salida')?.total || 0), mermas: Number(mermas.total) });
  });
  api.use((_req, res) => res.status(404).json({ error: 'Ruta no disponible.' }));
  api.use((error, _req, res, next) => {
    if (error instanceof Problema) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'La solicitud entra en conflicto con un registro existente.' });
    if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return res.status(409).json({ error: 'El inventario estaba ocupado. Inténtalo de nuevo.' });
    }
    next(error);
  });
  return api;
}

module.exports = { createApi };
