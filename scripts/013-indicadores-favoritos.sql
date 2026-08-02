-- Clasificación variable/fijo del plan de cuentas (para márgenes de contribución
-- y Punto de Equilibrio) + tabla de favoritos de indicadores para el Dashboard.

ALTER TABLE plan_cuentas
  ADD COLUMN IF NOT EXISTS comportamiento VARCHAR(10)
  CHECK (comportamiento IN ('variable', 'fijo'));

-- Seed inicial de clasificación (editable después desde /contabilidad -> Plan de
-- Cuentas). Las cuentas 5.4-5.10 pueden no existir todavía en algunas bases (se
-- crean recién cuando se carga el primer Ingreso/Egreso de esa categoría) -- estos
-- UPDATE son no-op si la cuenta todavía no existe.
UPDATE plan_cuentas SET comportamiento = 'variable' WHERE codigo IN ('5.1', '5.8'); -- Costo de Mercadería Vendida, Gastos Flete
UPDATE plan_cuentas SET comportamiento = 'fijo' WHERE codigo IN ('5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.9', '5.10'); -- Gastos Operativos, Compras, Publicidad, Honorarios, Varios, Impositivos, Alquiler, Rodado

-- Favoritos de indicadores para el Dashboard.
CREATE TABLE IF NOT EXISTS preferencias_dashboard (
  id_preferencia SERIAL PRIMARY KEY,
  indicador_codigo VARCHAR(50) NOT NULL UNIQUE,
  es_favorito BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
