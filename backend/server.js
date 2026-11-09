const express = require('express');
const path = require('node:path');
const { createApi } = require('./api');

function createApp(db, { secureCookies = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', express.json({ limit: '8kb' }), createApi(db, secureCookies));
  app.get('/', (_req, res) => res.redirect('/inicio%20de%20sesion/index.html'));
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
  app.use((error, _req, res, _next) => {
    if (error.status === 400 || error.status === 413) {
      return res.status(error.status).json({ error: 'Solicitud inválida o demasiado larga.' });
    }
    console.error(error.code || error.name);
    res.status(500).json({ error: 'No se pudo completar la operación.' });
  });
  return app;
}

if (require.main === module) {
  const db = require('./db');
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  db.query('SELECT 1 FROM sesiones LIMIT 1').then(() => {
    createApp(db, { secureCookies: process.env.COOKIE_SECURE === 'true' }).listen(port, host, () => {
      console.log('Inventario Imperio disponible en http://' + host + ':' + port);
    });
  }).catch(async error => {
    console.error('MySQL no está listo. Revisa backend/.env e importa ambos scripts SQL. (' + (error.code || error.name) + ')');
    await db.end();
    process.exitCode = 1;
  });
}

module.exports = { createApp };
