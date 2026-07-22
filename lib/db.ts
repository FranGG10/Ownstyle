import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!databaseUrl) {
  console.error("[v0] DATABASE_URL or POSTGRES_URL not found in environment variables")
}

export const sql = neon(databaseUrl!)

// Types for the database - aligned with actual schema
export interface Producto {
  id_producto: number
  codigo_sku: string
  descripcion: string
  marca: string
  modelo: string
  categoria: string
  talle: string
  color: string
  costo: number
  stock_actual: number
  stock_minimo: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface TipoVenta {
  id_tipo_venta: number
  nombre: string
  descripcion: string
  cantidad_minima: number
  precio: number
  activo: boolean
}

export interface Proveedor {
  id_proveedor: number
  razon_social: string
  cuit: string
  domicilio: string
  condicion_iva: string
  telefono: string
  email: string
  activo: boolean
  created_at: string
}

export interface Cliente {
  id_cliente: number
  razon_social: string
  cuit: string
  domicilio: string
  condicion_iva: string
  telefono: string
  email: string
  activo: boolean
  created_at: string
}

export interface PlanCuenta {
  id_cuenta: number
  codigo: string
  nombre: string
  tipo: "activo" | "pasivo" | "patrimonio" | "ingreso" | "gasto"
  padre: number | null
  nivel: number
  activo: boolean
}

export interface Movimiento {
  id_movimiento: number
  tipo: "venta" | "compra" | "cambio" | "ajuste" | "nota_credito" | "nota_debito"
  numero_comprobante: string
  fecha: string
  id_cliente: number | null
  id_proveedor: number | null
  subtotal: number
  iva: number
  total: number
  medio_pago: string
  nombre_cliente: string | null
  telefono: string | null
  barrio: string | null
  direccion: string | null
  estado: string
  observaciones: string
  created_at: string
  created_by: number | null
}

export interface MovimientoDetalle {
  id_detalle: number
  id_movimiento: number
  id_producto: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface StockMovimiento {
  id_stock_mov: number
  id_producto: number
  id_movimiento: number | null
  tipo: "entrada" | "salida" | "ajuste"
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string
  fecha: string
}

export interface Asiento {
  id_asiento: number
  fecha: string
  id_movimiento: number | null
  descripcion: string
  created_at: string
}

export interface AsientoDetalle {
  id_asiento_detalle: number
  id_asiento: number
  id_cuenta: number
  debe: number
  haber: number
}

export interface Configuracion {
  id_config: number
  clave: string
  valor: string
  descripcion: string
}

export interface IngresoEgreso {
  id_ingreso_egreso: number
  tipo: "ingreso" | "egreso"
  fecha: string
  id_cuenta: number | null
  monto: number
  descripcion: string
  categoria: string
  created_at: string
}
