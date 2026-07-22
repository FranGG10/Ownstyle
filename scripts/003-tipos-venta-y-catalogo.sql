-- =============================================
-- ACTUALIZACIÓN: TIPOS DE VENTA Y CATÁLOGO COMPLETO
-- =============================================

-- 1. CREAR TABLA tipos_venta
CREATE TABLE IF NOT EXISTS tipos_venta (
  id_tipo_venta SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200),
  cantidad_minima INTEGER DEFAULT 1,
  precio DECIMAL(12,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. INSERTAR TIPOS DE VENTA
INSERT INTO tipos_venta (nombre, descripcion, cantidad_minima, precio, orden) VALUES
('Venta Menor', 'Venta al por menor (1-5 unidades)', 1, 35000.00, 1),
('Venta Mayor 6+', 'Venta mayorista 6 o más unidades', 6, 25000.00, 2),
('Venta Mayor 10+', 'Venta mayorista 10 o más unidades', 10, 24000.00, 3),
('Promo x3', 'Promoción por 3 unidades', 3, 26666.67, 4),
('Promo x2', 'Promoción por 2 unidades', 2, 30000.00, 5);

-- 3. QUITAR COLUMNA precio_venta DE productos (ya no se usa)
ALTER TABLE productos DROP COLUMN IF EXISTS precio_venta;

-- 4. LIMPIAR PRODUCTOS EXISTENTES (para insertar catálogo nuevo)
DELETE FROM stock_movimientos WHERE id_producto IN (SELECT id_producto FROM productos);
DELETE FROM movimientos_detalle WHERE id_producto IN (SELECT id_producto FROM productos);
DELETE FROM productos;

-- 5. INSERTAR CATÁLOGO COMPLETO (32 modelos x 11 talles = 352 productos)
-- Función auxiliar para generar SKU
-- Formato: MARCA-MODELO-TALLE

-- ADIDAS SAMBA BLANCA - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'ADIDAS-SAMBABLANCA-' || talle::text,
  'Adidas Samba Blanca Talle ' || talle::text,
  'Adidas',
  'Samba',
  talle::text,
  'Blanca',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- ADIDAS SAMBA NEGRA - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'ADIDAS-SAMBANEGRA-' || talle::text,
  'Adidas Samba Negra Talle ' || talle::text,
  'Adidas',
  'Samba',
  talle::text,
  'Negra',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- AIR FORCE BLANCA - $12,500
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'AIRFORCE-BLANCA-' || talle::text,
  'Air Force Blanca Talle ' || talle::text,
  'Air Force',
  'Air Force',
  talle::text,
  'Blanca',
  12500.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS BLACK - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-BLACK-' || talle::text,
  'Campus Black Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Black',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS CLASICA - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-CLASICA-' || talle::text,
  'Campus Clasica Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Clasica',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS FULL BLANCA - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-FULLBLANCA-' || talle::text,
  'Campus Full Blanca Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Full Blanca',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS GRIS - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-GRIS-' || talle::text,
  'Campus Gris Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Gris',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS NUEVA NEGRA - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-NUEVANEGRA-' || talle::text,
  'Campus Nueva Negra Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Nueva Negra',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS ROJO - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-ROJO-' || talle::text,
  'Campus Rojo Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Rojo',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS VERDE - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-VERDE-' || talle::text,
  'Campus Verde Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Verde',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- CAMPUS NUEVA BN - $14,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'CAMPUS-NUEVABN-' || talle::text,
  'Campus Nueva BN Talle ' || talle::text,
  'Campus',
  'Campus',
  talle::text,
  'Nueva BN',
  14000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- JORDAN BLANCA - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'JORDAN-BLANCA-' || talle::text,
  'Jordan Blanca Talle ' || talle::text,
  'Jordan',
  'Jordan',
  talle::text,
  'Blanca',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- JORDAN BOTA - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'JORDAN-BOTA-' || talle::text,
  'Jordan Bota Talle ' || talle::text,
  'Jordan',
  'Jordan',
  talle::text,
  'Bota',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- JORDAN PANDA - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'JORDAN-PANDA-' || talle::text,
  'Jordan Panda Talle ' || talle::text,
  'Jordan',
  'Jordan',
  talle::text,
  'Panda',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ CON CAMARA BCO - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQCONCAMARA-BCO-' || talle::text,
  'MQ con Camara BCO Talle ' || talle::text,
  'MQ con Camara',
  'MQ',
  talle::text,
  'BCO',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ CON CAMARA BG - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQCONCAMARA-BG-' || talle::text,
  'MQ con Camara BG Talle ' || talle::text,
  'MQ con Camara',
  'MQ',
  talle::text,
  'BG',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ CON CAMARA NE - $12,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQCONCAMARA-NE-' || talle::text,
  'MQ con Camara NE Talle ' || talle::text,
  'MQ con Camara',
  'MQ',
  talle::text,
  'NE',
  12000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ BB - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQBB-' || talle::text,
  'MQ sin Camara MQ BB Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ BB',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ BN - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQBN-' || talle::text,
  'MQ sin Camara MQ BN Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ BN',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ BLACK - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQBLACK-' || talle::text,
  'MQ sin Camara MQ Black Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ Black',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ NB - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQNB-' || talle::text,
  'MQ sin Camara MQ NB Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ NB',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ NN - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQNN-' || talle::text,
  'MQ sin Camara MQ NN Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ NN',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- MQ SIN CAMARA MQ ROJO - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'MQSINCAMARA-MQROJO-' || talle::text,
  'MQ sin Camara MQ Rojo Talle ' || talle::text,
  'MQ sin Camara',
  'MQ',
  talle::text,
  'MQ Rojo',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- NIKE REACT BLANCA - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'NIKE-REACTBLANCA-' || talle::text,
  'Nike React Blanca Talle ' || talle::text,
  'Nike',
  'React',
  talle::text,
  'Blanca',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- NIKE REACT CLASICA - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'NIKE-REACTCLASICA-' || talle::text,
  'Nike React Clasica Talle ' || talle::text,
  'Nike',
  'React',
  talle::text,
  'Clasica',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- PUMA BLANCA - $14,500
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'PUMA-BLANCA-' || talle::text,
  'Puma Blanca Talle ' || talle::text,
  'Puma',
  'Puma',
  talle::text,
  'Blanca',
  14500.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- PUMA CLASICA - $14,500
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'PUMA-CLASICA-' || talle::text,
  'Puma Clasica Talle ' || talle::text,
  'Puma',
  'Puma',
  talle::text,
  'Clasica',
  14500.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- PUMA GRIS - $14,500
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'PUMA-GRIS-' || talle::text,
  'Puma Gris Talle ' || talle::text,
  'Puma',
  'Puma',
  talle::text,
  'Gris',
  14500.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- PUMA ROJO - $14,500
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'PUMA-ROJO-' || talle::text,
  'Puma Rojo Talle ' || talle::text,
  'Puma',
  'Puma',
  talle::text,
  'Rojo',
  14500.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- VANS CLASICA - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'VANS-CLASICA-' || talle::text,
  'Vans Clasica Talle ' || talle::text,
  'Vans',
  'Vans',
  talle::text,
  'Clasica',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- VANS FULL N - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'VANS-FULLN-' || talle::text,
  'Vans Full N Talle ' || talle::text,
  'Vans',
  'Vans',
  talle::text,
  'Full N',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- VANS GRIS - $11,000
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, stock_actual, stock_minimo, activo)
SELECT 
  'VANS-GRIS-' || talle::text,
  'Vans Gris Talle ' || talle::text,
  'Vans',
  'Vans',
  talle::text,
  'Gris',
  11000.00,
  0,
  2,
  true
FROM generate_series(35, 45) AS talle;

-- 6. AGREGAR COLUMNA tipo_venta A MOVIMIENTOS
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS id_tipo_venta INTEGER REFERENCES tipos_venta(id_tipo_venta);

-- 7. AGREGAR COLUMNA precio_tipo_venta A MOVIMIENTOS_DETALLE
ALTER TABLE movimientos_detalle ADD COLUMN IF NOT EXISTS id_tipo_venta INTEGER REFERENCES tipos_venta(id_tipo_venta);

-- 8. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_productos_marca_color ON productos(marca, color);
CREATE INDEX IF NOT EXISTS idx_productos_talle ON productos(talle);
CREATE INDEX IF NOT EXISTS idx_tipos_venta_nombre ON tipos_venta(nombre);

-- 9. VERIFICAR CANTIDAD DE PRODUCTOS INSERTADOS
-- SELECT COUNT(*) as total_productos FROM productos;
-- Debería dar 352 (32 modelos x 11 talles)
