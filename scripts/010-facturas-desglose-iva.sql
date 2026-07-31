-- Desglose de IVA para Factura A/B (Factura C sigue con imp_iva = 0,
-- imp_neto = importe_total, ya que monotributo no discrimina IVA).
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS imp_neto DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS imp_iva DECIMAL(12,2) NOT NULL DEFAULT 0;
