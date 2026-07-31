-- Condición frente al IVA del emisor (determina si Ownstyle emite Factura
-- C, A o B) y umbral a partir del cual ARCA exige identificar al comprador.
INSERT INTO configuraciones (clave, valor, descripcion)
VALUES ('empresa_condicion_iva', 'Monotributo',
  'Condición frente al IVA del emisor: Monotributo o Responsable Inscripto. Determina si Ownstyle emite Factura C, A o B.')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuraciones (clave, valor, descripcion)
VALUES ('umbral_consumidor_final', '1000000',
  'Monto a partir del cual ARCA exige identificar al comprador (CUIT/DNI) en la factura')
ON CONFLICT (clave) DO NOTHING;
