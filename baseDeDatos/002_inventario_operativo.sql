USE mydb;

CREATE TABLE IF NOT EXISTS sesiones (
  id_sesion CHAR(36) PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  id_usuario INT NOT NULL,
  inicio DATETIME NOT NULL,
  vence DATETIME NOT NULL,
  fin DATETIME NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos_archivados (
  id_producto INT PRIMARY KEY,
  FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_detalle (
  id_movimiento INT PRIMARY KEY,
  id_sesion CHAR(36) NOT NULL,
  id_solicitud CHAR(36) NOT NULL UNIQUE,
  fecha_operacion DATE NOT NULL,
  detalle VARCHAR(150) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  FOREIGN KEY (id_movimiento) REFERENCES movimientos_inventario (id_movimiento) ON DELETE CASCADE,
  FOREIGN KEY (id_sesion) REFERENCES sesiones (id_sesion) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mermas_detalle (
  id_merma INT PRIMARY KEY,
  id_sesion CHAR(36) NOT NULL,
  id_solicitud CHAR(36) NOT NULL UNIQUE,
  fecha_operacion DATE NOT NULL,
  descripcion VARCHAR(250) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  FOREIGN KEY (id_merma) REFERENCES mermas (id_merma) ON DELETE CASCADE,
  FOREIGN KEY (id_sesion) REFERENCES sesiones (id_sesion) ON DELETE RESTRICT
) ENGINE=InnoDB;
