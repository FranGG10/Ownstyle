-- Facturación electrónica (ARCA / ex AFIP) para ventas
-- Guarda solo facturas efectivamente emitidas (con CAE real) - los intentos
-- fallidos no se persisten, se muestran como error en el momento.
CREATE TABLE IF NOT EXISTS facturas (
  id_factura SERIAL PRIMARY KEY,
  id_movimiento INTEGER NOT NULL UNIQUE REFERENCES movimientos(id_movimiento),
  tipo_comprobante INTEGER NOT NULL DEFAULT 11, -- 11 = Factura C
  punto_venta INTEGER NOT NULL,
  numero_comprobante INTEGER NOT NULL,
  cae VARCHAR(20) NOT NULL,
  cae_vencimiento DATE NOT NULL,
  doc_tipo INTEGER NOT NULL,
  doc_nro VARCHAR(20),
  importe_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facturas_movimiento ON facturas(id_movimiento);
