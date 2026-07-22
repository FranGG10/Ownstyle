"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

interface LineaCompra {
  id_producto: number
  cantidad: number
  costo_unitario: number
  subtotal: number
}

interface CompraData {
  id_proveedor: number
  fecha: string
  medio_pago: string
  total: number
  observaciones: string
  lineas: LineaCompra[]
}

export async function createCompra(data: CompraData) {
  try {
    // Generate comprobante number
    const [lastCompra] = await sql`
      SELECT numero_comprobante FROM movimientos 
      WHERE tipo = 'compra' 
      ORDER BY id_movimiento DESC LIMIT 1
    `
    const lastNum = lastCompra?.numero_comprobante
      ? Number.parseInt(lastCompra.numero_comprobante.split("-")[1] || "0")
      : 0
    const numeroComprobante = `C-${String(lastNum + 1).padStart(6, "0")}`

    // 1. Create movement (compra)
    const [movimiento] = await sql`
      INSERT INTO movimientos (tipo, numero_comprobante, id_proveedor, fecha, subtotal, iva, total, medio_pago, observaciones, estado)
      VALUES ('compra', ${numeroComprobante}, ${data.id_proveedor}, ${data.fecha}, ${data.total}, 0, ${data.total}, ${data.medio_pago}, ${data.observaciones || null}, 'completado')
      RETURNING id_movimiento
    `

    const idMovimiento = movimiento.id_movimiento

    // 2. Create movement details and update stock
    for (const linea of data.lineas) {
      await sql`
        INSERT INTO movimientos_detalle (id_movimiento, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (${idMovimiento}, ${linea.id_producto}, ${linea.cantidad}, ${linea.costo_unitario}, ${linea.subtotal})
      `

      // Get current stock
      const [producto] = await sql`
        SELECT stock_actual FROM productos WHERE id_producto = ${linea.id_producto}
      `
      const stockAnterior = producto.stock_actual
      const stockNuevo = stockAnterior + linea.cantidad

      // Update product stock and cost
      await sql`
        UPDATE productos 
        SET stock_actual = ${stockNuevo}, 
            costo = ${linea.costo_unitario},
            updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${linea.id_producto}
      `

      // Create stock movement
      await sql`
        INSERT INTO stock_movimientos (id_producto, id_movimiento, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${linea.id_producto}, ${idMovimiento}, 'entrada', ${linea.cantidad}, ${stockAnterior}, ${stockNuevo}, ${`Compra ${numeroComprobante}`})
      `
    }

    // 3. Create accounting entry (asiento contable)
    await createAsientoCompra(idMovimiento, data, numeroComprobante)

    revalidatePath("/compras")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return { success: true, id: idMovimiento, comprobante: numeroComprobante }
  } catch (error: any) {
    console.error("Error creating compra:", error)
    return { success: false, error: error.message || "Error al crear la compra" }
  }
}

async function createAsientoCompra(idMovimiento: number, data: CompraData, numeroComprobante: string) {
  // Get account IDs from plan_cuentas
  const cuentas = await sql`
    SELECT codigo, id_cuenta FROM plan_cuentas 
    WHERE codigo IN ('1.1.3', '1.1.1', '1.1.2')
  `

  const getCuentaId = (codigo: string) => cuentas.find((c) => c.codigo === codigo)?.id_cuenta

  const cuentaMercaderias = getCuentaId("1.1.3") // Mercaderías
  const cuentaCaja = getCuentaId("1.1.1") // Caja
  const cuentaBanco = getCuentaId("1.1.2") // Banco

  // Determinar cuenta de salida según medio de pago
  const cuentaSalida = data.medio_pago === "efectivo" ? cuentaCaja : cuentaBanco
  const cuentaSalidaNombre = data.medio_pago === "efectivo" ? "Pago en efectivo" : "Pago por transferencia"

  // Create asiento header - only use columns that exist
  const [asiento] = await sql`
    INSERT INTO asientos (id_movimiento, fecha, descripcion)
    VALUES (${idMovimiento}, ${data.fecha}, ${`Compra ${numeroComprobante} - ${cuentaSalidaNombre}`})
    RETURNING id_asiento
  `

  const idAsiento = asiento.id_asiento

  // DEBE: Mercaderías (por el total)
  if (cuentaMercaderias) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaMercaderias}, ${data.total}, 0)
    `
  }

  // HABER: Caja o Banco (por el total) - según medio de pago
  if (cuentaSalida) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaSalida}, 0, ${data.total})
    `
  }
}

export async function deleteCompra(idMovimiento: number) {
  try {
    // 1. Get movement details to restore stock
    const detalles = await sql`
      SELECT md.id_producto, md.cantidad, p.stock_actual
      FROM movimientos_detalle md
      JOIN productos p ON p.id_producto = md.id_producto
      WHERE md.id_movimiento = ${idMovimiento}
    `

    // 2. Restore stock for each product (subtract since it was an entrada)
    for (const detalle of detalles) {
      const stockNuevo = Number(detalle.stock_actual) - Number(detalle.cantidad)

      await sql`
        UPDATE productos 
        SET stock_actual = ${stockNuevo}, updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${detalle.id_producto}
      `
    }

    // 3. Delete stock movements
    await sql`
      DELETE FROM stock_movimientos WHERE id_movimiento = ${idMovimiento}
    `

    // 4. Delete accounting entry details first (foreign key)
    await sql`
      DELETE FROM asientos_detalle 
      WHERE id_asiento IN (SELECT id_asiento FROM asientos WHERE id_movimiento = ${idMovimiento})
    `

    // 5. Delete accounting entry
    await sql`
      DELETE FROM asientos WHERE id_movimiento = ${idMovimiento}
    `

    // 6. Delete movement details
    await sql`
      DELETE FROM movimientos_detalle WHERE id_movimiento = ${idMovimiento}
    `

    // 7. Delete movement
    await sql`
      DELETE FROM movimientos WHERE id_movimiento = ${idMovimiento}
    `

    revalidatePath("/compras")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting compra:", error)
    return { success: false, error: error.message || "Error al eliminar la compra" }
  }
}
