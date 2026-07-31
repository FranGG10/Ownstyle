-- Fecha en la que efectivamente se emitió la factura ante ARCA (puede diferir
-- de la fecha de la venta original). Para facturas ya existentes, se completa
-- con la fecha de created_at como mejor aproximación disponible.
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS fecha_emision DATE;
UPDATE facturas SET fecha_emision = created_at::date WHERE fecha_emision IS NULL;
ALTER TABLE facturas ALTER COLUMN fecha_emision SET NOT NULL;
