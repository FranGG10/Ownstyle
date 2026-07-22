-- =============================================
-- SISTEMA ERP ZAPATILLAS - ESQUEMA DE BASE DE DATOS
-- =============================================

-- 1. TABLA: plan_cuentas (Plan de cuentas contable)
CREATE TABLE plan_cuentas (
  id_cuenta SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto')),
  padre_id INTEGER REFERENCES plan_cuentas(id_cuenta),
  nivel INTEGER DEFAULT 1,
  es_imputable BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: proveedores
CREATE TABLE proveedores (
  id_proveedor SERIAL PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  cuit VARCHAR(13) UNIQUE,
  domicilio VARCHAR(300),
  condicion_iva VARCHAR(50) DEFAULT 'Responsable Inscripto',
  telefono VARCHAR(50),
  email VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: clientes
CREATE TABLE clientes (
  id_cliente SERIAL PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  cuit VARCHAR(13),
  domicilio VARCHAR(300),
  condicion_iva VARCHAR(50) DEFAULT 'Consumidor Final',
  telefono VARCHAR(50),
  email VARCHAR(100),
  es_generico BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: productos (zapatillas)
CREATE TABLE productos (
  id_producto SERIAL PRIMARY KEY,
  codigo_sku VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(300) NOT NULL,
  marca VARCHAR(100),
  categoria VARCHAR(100),
  talle VARCHAR(10),
  color VARCHAR(50),
  costo DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) DEFAULT 0,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA: movimientos (encabezado de operaciones)
CREATE TABLE movimientos (
  id_movimiento SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venta', 'compra', 'cambio', 'ajuste', 'nota_credito', 'nota_debito')),
  numero_comprobante VARCHAR(50),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  id_cliente INTEGER REFERENCES clientes(id_cliente),
  id_proveedor INTEGER REFERENCES proveedores(id_proveedor),
  subtotal DECIMAL(12,2) DEFAULT 0,
  iva DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('pendiente', 'completado', 'anulado')),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA: movimientos_detalle (items de cada movimiento)
CREATE TABLE movimientos_detalle (
  id_detalle SERIAL PRIMARY KEY,
  id_movimiento INTEGER NOT NULL REFERENCES movimientos(id_movimiento) ON DELETE CASCADE,
  id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  costo_unitario DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA: stock_movimientos (historial de movimientos de stock)
CREATE TABLE stock_movimientos (
  id_stock_mov SERIAL PRIMARY KEY,
  id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
  id_movimiento INTEGER REFERENCES movimientos(id_movimiento),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: asientos (encabezado de asientos contables)
CREATE TABLE asientos (
  id_asiento SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  id_movimiento INTEGER REFERENCES movimientos(id_movimiento),
  descripcion VARCHAR(300),
  total_debe DECIMAL(12,2) DEFAULT 0,
  total_haber DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA: asientos_detalle (partidas del asiento)
CREATE TABLE asientos_detalle (
  id_asiento_detalle SERIAL PRIMARY KEY,
  id_asiento INTEGER NOT NULL REFERENCES asientos(id_asiento) ON DELETE CASCADE,
  id_cuenta INTEGER NOT NULL REFERENCES plan_cuentas(id_cuenta),
  descripcion VARCHAR(200),
  debe DECIMAL(12,2) DEFAULT 0,
  haber DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA: reglas_contables (configuración de asientos automáticos)
CREATE TABLE reglas_contables (
  id_regla SERIAL PRIMARY KEY,
  tipo_movimiento VARCHAR(20) NOT NULL,
  concepto VARCHAR(50) NOT NULL,
  id_cuenta INTEGER NOT NULL REFERENCES plan_cuentas(id_cuenta),
  tipo_partida VARCHAR(10) NOT NULL CHECK (tipo_partida IN ('debe', 'haber')),
  descripcion VARCHAR(200),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA: configuraciones (parámetros del sistema)
CREATE TABLE configuraciones (
  id_config SERIAL PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor VARCHAR(500),
  descripcion VARCHAR(300),
  tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'numero', 'booleano', 'cuenta')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABLA: usuarios (para auditoría)
CREATE TABLE usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'contador', 'operador')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABLA: ingresos_egresos (movimientos financieros no relacionados con compra/venta)
CREATE TABLE ingresos_egresos (
  id_ingreso_egreso SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  id_cuenta INTEGER REFERENCES plan_cuentas(id_cuenta),
  monto DECIMAL(12,2) NOT NULL,
  descripcion VARCHAR(300),
  categoria VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================
CREATE INDEX idx_productos_codigo ON productos(codigo_sku);
CREATE INDEX idx_productos_marca ON productos(marca);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_asientos_fecha ON asientos(fecha);
CREATE INDEX idx_stock_mov_producto ON stock_movimientos(id_producto);
CREATE INDEX idx_plan_cuentas_codigo ON plan_cuentas(codigo);
