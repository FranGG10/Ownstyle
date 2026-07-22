-- =============================================
-- DATOS INICIALES DEL SISTEMA
-- =============================================

-- PLAN DE CUENTAS BÁSICO
INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, es_imputable) VALUES
-- ACTIVO
('1', 'ACTIVO', 'activo', 1, false),
('1.1', 'ACTIVO CORRIENTE', 'activo', 2, false),
('1.1.1', 'Caja', 'activo', 3, true),
('1.1.2', 'Banco', 'activo', 3, true),
('1.1.3', 'Mercaderías', 'activo', 3, true),
('1.1.4', 'IVA Crédito Fiscal', 'activo', 3, true),
('1.1.5', 'Deudores por Ventas', 'activo', 3, true),

-- PASIVO
('2', 'PASIVO', 'pasivo', 1, false),
('2.1', 'PASIVO CORRIENTE', 'pasivo', 2, false),
('2.1.1', 'Proveedores', 'pasivo', 3, true),
('2.1.2', 'IVA Débito Fiscal', 'pasivo', 3, true),
('2.1.3', 'Otras Deudas', 'pasivo', 3, true),

-- PATRIMONIO NETO
('3', 'PATRIMONIO NETO', 'patrimonio', 1, false),
('3.1', 'Capital', 'patrimonio', 2, true),
('3.2', 'Resultados Acumulados', 'patrimonio', 2, true),

-- INGRESOS
('4', 'INGRESOS', 'ingreso', 1, false),
('4.1', 'INGRESOS OPERATIVOS', 'ingreso', 2, false),
('4.1.1', 'Ventas', 'ingreso', 3, true),
('4.1.2', 'Otros Ingresos', 'ingreso', 3, true),

-- GASTOS
('5', 'GASTOS', 'gasto', 1, false),
('5.1', 'COSTO DE VENTAS', 'gasto', 2, false),
('5.1.1', 'Costo Mercadería Vendida', 'gasto', 3, true),
('5.2', 'GASTOS OPERATIVOS', 'gasto', 2, false),
('5.2.1', 'Gastos Generales', 'gasto', 3, true),
('5.2.2', 'Gastos de Personal', 'gasto', 3, true);

-- Actualizar padre_id basado en código
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '1') WHERE codigo LIKE '1.%' AND codigo NOT LIKE '1.%.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '1.1') WHERE codigo LIKE '1.1.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '2') WHERE codigo LIKE '2.%' AND codigo NOT LIKE '2.%.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '2.1') WHERE codigo LIKE '2.1.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '3') WHERE codigo LIKE '3.%' AND codigo NOT LIKE '3.%.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '4') WHERE codigo LIKE '4.%' AND codigo NOT LIKE '4.%.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '4.1') WHERE codigo LIKE '4.1.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '5') WHERE codigo LIKE '5.%' AND codigo NOT LIKE '5.%.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '5.1') WHERE codigo LIKE '5.1.%';
UPDATE plan_cuentas SET padre_id = (SELECT id_cuenta FROM plan_cuentas p WHERE p.codigo = '5.2') WHERE codigo LIKE '5.2.%';

-- CLIENTE GENÉRICO (Consumidor Final)
INSERT INTO clientes (razon_social, condicion_iva, es_generico) VALUES
('Consumidor Final', 'Consumidor Final', true);

-- REGLAS CONTABLES PARA ASIENTOS AUTOMÁTICOS
-- Reglas para VENTA
INSERT INTO reglas_contables (tipo_movimiento, concepto, id_cuenta, tipo_partida, descripcion) VALUES
('venta', 'total', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '1.1.1'), 'debe', 'Caja por venta'),
('venta', 'subtotal', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '4.1.1'), 'haber', 'Ventas'),
('venta', 'iva', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '2.1.2'), 'haber', 'IVA Débito Fiscal'),
('venta', 'costo', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '5.1.1'), 'debe', 'Costo Mercadería Vendida'),
('venta', 'costo', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '1.1.3'), 'haber', 'Baja de Mercaderías');

-- Reglas para COMPRA
INSERT INTO reglas_contables (tipo_movimiento, concepto, id_cuenta, tipo_partida, descripcion) VALUES
('compra', 'subtotal', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '1.1.3'), 'debe', 'Mercaderías'),
('compra', 'iva', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '1.1.4'), 'debe', 'IVA Crédito Fiscal'),
('compra', 'total', (SELECT id_cuenta FROM plan_cuentas WHERE codigo = '2.1.1'), 'haber', 'Proveedores');

-- CONFIGURACIONES INICIALES
INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES
('cuenta_caja', '1.1.1', 'Cuenta de Caja', 'cuenta'),
('cuenta_ventas', '4.1.1', 'Cuenta de Ventas', 'cuenta'),
('cuenta_compras', '1.1.3', 'Cuenta de Mercaderías', 'cuenta'),
('cuenta_iva_debito', '2.1.2', 'Cuenta IVA Débito Fiscal', 'cuenta'),
('cuenta_iva_credito', '1.1.4', 'Cuenta IVA Crédito Fiscal', 'cuenta'),
('cuenta_proveedores', '2.1.1', 'Cuenta Proveedores', 'cuenta'),
('cuenta_cmv', '5.1.1', 'Cuenta Costo Mercadería Vendida', 'cuenta'),
('cliente_generico_id', '1', 'ID del cliente genérico', 'numero'),
('generar_asientos_auto', 'true', 'Generar asientos contables automáticamente', 'booleano'),
('iva_tasa', '21', 'Tasa de IVA por defecto (%)', 'numero'),
('empresa_nombre', 'Mi Zapatería', 'Nombre de la empresa', 'texto'),
('empresa_cuit', '20-12345678-9', 'CUIT de la empresa', 'texto');

-- PROVEEDOR DE EJEMPLO
INSERT INTO proveedores (razon_social, cuit, domicilio, condicion_iva, telefono, email) VALUES
('Nike Argentina S.A.', '30-12345678-1', 'Av. del Libertador 1234, CABA', 'Responsable Inscripto', '011-4567-8901', 'ventas@nike.com.ar'),
('Adidas Argentina S.R.L.', '30-98765432-1', 'Av. Corrientes 5678, CABA', 'Responsable Inscripto', '011-9876-5432', 'ventas@adidas.com.ar');

-- PRODUCTOS DE EJEMPLO
INSERT INTO productos (codigo_sku, descripcion, marca, categoria, talle, color, costo, precio_venta, stock_actual, stock_minimo) VALUES
('NK-AF1-WHT-42', 'Nike Air Force 1 Blanco', 'Nike', 'Urbanas', '42', 'Blanco', 85000.00, 145000.00, 10, 3),
('NK-AF1-BLK-42', 'Nike Air Force 1 Negro', 'Nike', 'Urbanas', '42', 'Negro', 85000.00, 145000.00, 8, 3),
('AD-SMBR-WHT-43', 'Adidas Samba Blanco', 'Adidas', 'Urbanas', '43', 'Blanco', 75000.00, 125000.00, 12, 3),
('NK-AM90-GRY-41', 'Nike Air Max 90 Gris', 'Nike', 'Running', '41', 'Gris', 95000.00, 165000.00, 5, 2),
('AD-UB22-BLK-44', 'Adidas Ultraboost 22 Negro', 'Adidas', 'Running', '44', 'Negro', 110000.00, 189000.00, 7, 2);

-- USUARIO ADMIN POR DEFECTO
INSERT INTO usuarios (nombre, email, rol) VALUES
('Administrador', 'admin@zapateria.com', 'admin');
