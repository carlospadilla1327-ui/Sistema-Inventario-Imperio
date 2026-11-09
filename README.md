# PROYECTO-SOFTWARE: SISTEMA DE GESTIÓN DE INVENTARIOS - IMPERIO | CLAMATOS Y SNACKS

## Ejecutar el inventario en local

Requisitos: Node.js 22 o posterior y MySQL 8.0 o 8.4.

1. En MySQL Workbench, abre y ejecuta `baseDeDatos/script_base_datos.sql` y después `baseDeDatos/002_inventario_operativo.sql`. Ambos usan el esquema `mydb`. Si ya existe, el segundo script agrega las tablas de sesiones, archivo y datos de operación.
2. Crea un usuario de aplicación en MySQL con permisos `SELECT`, `INSERT` y `UPDATE` sobre `mydb.*`. En MySQL Workbench puedes hacerlo desde **Users and Privileges**. Usa sus credenciales en `backend/.env`.
3. En PowerShell 7, abre una terminal en la raíz del proyecto:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   notepad .env
   npm.cmd ci
   ```

4. Crea una cuenta para la Dueña y, si vas a probar el segundo rol, una para un Empleado. Sustituye los correos por los que quieras usar. Cada contraseña debe tener al menos 12 caracteres. `Read-Host -MaskInput` oculta lo que escribes.

   ```powershell
   (Read-Host -MaskInput 'Contraseña de Dueña') | node crear-usuario.js duena duena@example.com 'Dueña'
   (Read-Host -MaskInput 'Contraseña de Empleado') | node crear-usuario.js empleado empleado@example.com 'Empleado'
   npm.cmd start
   ```

5. Abre [http://localhost:3000](http://localhost:3000). Inicia sesión como Dueña y crea un producto con una categoría, unidad y stock inicial. Registra una entrada, una salida y una merma. Abre otra sesión desde una ventana privada como Empleado y consulta el mismo stock.

Si importaste una versión anterior con cuentas de demostración, crea cuentas con correos distintos. El inicio de sesión exige contraseñas protegidas con scrypt. El archivo `.env` está excluido de Git.

### Alcance de esta versión

- **Dueña:** alta, edición y archivo de productos, consulta de stock y alertas, movimientos, registro e historial de mermas.
- **Empleado:** consulta de stock, entradas, salidas y registro de mermas.
- **Corte de caja:** el resumen del turno actual usa los conteos del inventario. Los importes y los resúmenes guardados siguen en modo demostración. Los perfiles se crean por terminal y las pantallas de Reportes, Finanzas y Perfiles siguen pendientes de integración.
- Las cantidades admiten dos decimales. Las salidas y las mermas comparten el mismo stock. Para ajustar existencias, registra un movimiento. Para archivar un producto, primero deja su stock en cero.
- Los datos de demostración guardados antes en el navegador se conservan en ese navegador. Para iniciar el catálogo en MySQL, captura los productos desde el módulo de Inventario.

Para uso compartido, el equipo necesita una sola instancia del servidor Express con acceso a MySQL. En un servidor detrás de HTTPS configura `HOST=0.0.0.0` si el alojamiento lo requiere y `COOKIE_SECURE=true`. El repositorio Git guarda el código y los scripts SQL.

##  INTEGRANTES
* ERICK IVAN SANCHEZ AGUIRRE
* SANTIAGO DE LA PEÑA MARTINEZ
* CARLOS EMANUEL MUÑOZ PADILLA
* RICARDO DANIEL JASSO TORRES

##  DESCRIPCIÓN DEL PROYECTO
**Imperio | Clamatos & Snacks** es una empresa del sector gastronómico fundada en 2022 en la ciudad de Saltillo, Coahuila. Bajo la dirección de su propietaria, la C. Mónica Muñoz, el negocio surgió con el propósito de ofrecer una propuesta artesanal que combina la frescura de la coctelería de mariscos con la innovación en snacks dulces y de temporada.

Este repositorio contiene la arquitectura, la base de datos, el backend y el desarrollo modular del sistema de software diseñado para automatizar y optimizar sus procesos de control de inventarios, entradas y salidas de insumos, perfiles y operaciones financieras.

##  ESTRUCTURA GENERAL DEL REPOSITORIO
El proyecto se encuentra organizado en las siguientes carpetas y módulos principales:

- **`Documentacion de la IA/`**
  - `IA TEXTO.txt`
- **`backend/`**
  - `administracion perfiles`
  - `corte de caja`
  - `entrada y salida de insumos`
  - `gestion de cuentas financieras`
  - `gestion de inventario`
  - `inicio de sesion`
  - `productos no aptos`
  - `reporte de insumos, mermas y desperdicios`
  - `db.js`
  - `package-lock.json`
  - `package.json`
  - `server.js`
- **`baseDeDatos/`**
  - `script_base_datos.sql`
- **`frontend/`**
  - `administracion perfiles`
  - `compartido`
  - `corte de caja`
  - `entrada y salida de insumos`
  - `gestion de cuentas financieras`
  - `gestion de inventario`
  - `inicio de sesion`
  - `productos no aptos`
  - `reporte de insumos, mermas y desperdicios`

##  MÓDULOS PRINCIPALES DEL SISTEMA
1. **Inicio de Sesión y Perfiles:** Autenticación segura de usuarios y administración de roles (Dueña / Empleado).
2. **Gestión de Inventario:** Control de stock de productos y gestión de artículos.
3. **Entradas y Salidas de Insumos:** Registro detallado de los movimientos del almacén.
4. **Productos no Aptos / Mermas:** Control y registro de productos que ya no cumplen con los estándares para su venta.
5. **Corte de Caja y Finanzas:** Módulos diseñados para el control financiero y la realización del corte de caja diario.
6. **Reportes:** Generación de informes sobre insumos, mermas y desperdicios.
DESCRIPCION
Imperio | Clamatos & Snacks es una empresa del sector gastronómico fundada en 2022
en la ciudad de Saltillo, Coahuila. Bajo la dirección de su propietaria, la C. Mónica
Muñoz, el negocio surgió con el propósito de ofrecer una propuesta artesanal que
combina la frescura de la coctelería de mariscos con la innovación en snacks dulces y de
temporada.
