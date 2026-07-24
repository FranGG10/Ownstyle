"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { notificarConsumoStockSindic } from "@/lib/sindic-stock"

interface LineaVenta {
  id_producto: number
  cantidad: number
  costo_unitario: number
}

interface VentaData {
  id_cliente: number
  fecha: string
  medio_pago: string
  importe_total: number
  nombre: string
  telefono: string
  barrio: string
  direccion: string
  observaciones: string
  total_costo: number
  lineas: LineaVenta[]
}

export async function createVenta(data: VentaData) {
  try {
    // Generate comprobante number
    const [lastVenta] = await sql`
      SELECT numero_comprobante FROM movimientos 
      WHERE tipo = 'venta' 
      ORDER BY id_movimiento DESC LIMIT 1
    `
    const lastNum = lastVenta?.numero_comprobante
      ? Number.parseInt(lastVenta.numero_comprobante.split("-")[1] || "0")
      : 0
    const numeroComprobante = `V-${String(lastNum + 1).padStart(6, "0")}`

    const [movimiento] = await sql`
      INSERT INTO movimientos (
        tipo, numero_comprobante, id_cliente, fecha, medio_pago,
        subtotal, iva, total, nombre_cliente, telefono, barrio, direccion,
        observaciones, estado
      )
      VALUES (
        'venta', ${numeroComprobante}, ${data.id_cliente}, ${data.fecha}, ${data.medio_pago},
        ${data.importe_total}, 0, ${data.importe_total}, 
        ${data.nombre || null}, ${data.telefono || null}, ${data.barrio || null}, ${data.direccion || null},
        ${data.observaciones || null}, 'completado'
      )
      RETURNING id_movimiento
    `

    const idMovimiento = movimiento.id_movimiento

    // 2. Create movement details and update stock
    for (const linea of data.lineas) {
      await sql`
        INSERT INTO movimientos_detalle (id_movimiento, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (${idMovimiento}, ${linea.id_producto}, ${linea.cantidad}, ${linea.costo_unitario}, ${linea.cantidad * linea.costo_unitario})
      `

      // Get current stock and category
      const [producto] = await sql`
        SELECT stock_actual, categoria, modelo, color, talle FROM productos WHERE id_producto = ${linea.id_producto}
      `

      // Los productos de categoria "Ropa" tienen stock ilimitado acá: no se descuenta stock
      // local ni se registra movimiento de stock, pero sí se genera el asiento de venta y CMV.
      // El stock físico de esta ropa vive en Sindic (otro sistema), así que se le avisa por
      // API para que descuente ahí; si Sindic no responde no debe frenar la venta acá.
      if (producto.categoria === "Ropa") {
        await notificarConsumoStockSindic({
          modelo: producto.modelo,
          color: producto.color,
          talla: producto.talle,
          quantity: linea.cantidad,
          reference: numeroComprobante,
        })
        continue
      }

      const stockAnterior = producto.stock_actual
      const stockNuevo = stockAnterior - linea.cantidad

      // Update product stock
      await sql`
        UPDATE productos 
        SET stock_actual = ${stockNuevo}, updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${linea.id_producto}
      `

      // Create stock movement
      await sql`
        INSERT INTO stock_movimientos (id_producto, id_movimiento, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${linea.id_producto}, ${idMovimiento}, 'salida', ${linea.cantidad}, ${stockAnterior}, ${stockNuevo}, ${"Venta " + numeroComprobante})
      `
    }

    // 3. Create accounting entry (asiento contable)
    await createAsientoVenta(idMovimiento, data, numeroComprobante)

    revalidatePath("/ventas")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return { success: true, id: idMovimiento, comprobante: numeroComprobante }
  } catch (error: any) {
    console.error("Error creating venta:", error)
    return { success: false, error: error.message || "Error al crear la venta" }
  }
}

async function createAsientoVenta(idMovimiento: number, data: VentaData, numeroComprobante: string) {
  // Get account IDs from plan_cuentas
  // Usar Caja o Banco según medio de pago
  const cuentaPago = data.medio_pago === "transferencia" ? "1.1.2" : "1.1.1"

  const cuentas = await sql`
    SELECT codigo, id_cuenta FROM plan_cuentas 
    WHERE codigo IN (${cuentaPago}, '4.1', '5.1', '1.1.3')
  `

  const getCuentaId = (codigo: string) => cuentas.find((c) => c.codigo === codigo)?.id_cuenta

  const cuentaCajaBanco = getCuentaId(cuentaPago)
  const cuentaVentas = getCuentaId("4.1")
  const cuentaCMV = getCuentaId("5.1")
  const cuentaMercaderias = getCuentaId("1.1.3")

  const descripcionPago = data.medio_pago === "transferencia" ? "Banco" : "Caja"

  const [asiento] = await sql`
    INSERT INTO asientos (id_movimiento, fecha, descripcion)
    VALUES (${idMovimiento}, ${data.fecha}, ${"Venta " + numeroComprobante + " - " + descripcionPago})
    RETURNING id_asiento
  `

  const idAsiento = asiento.id_asiento

  // DEBE: Caja o Banco (por el total cobrado)
  if (cuentaCajaBanco) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaCajaBanco}, ${data.importe_total}, 0)
    `
  }

  // HABER: Ventas (por el importe total)
  if (cuentaVentas) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaVentas}, 0, ${data.importe_total})
    `
  }

  // Asiento por el costo de mercadería vendida
  // DEBE: CMV
  if (cuentaCMV) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaCMV}, ${data.total_costo}, 0)
    `
  }

  // HABER: Mercaderías (baja de stock)
  if (cuentaMercaderias) {
    await sql`
      INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
      VALUES (${idAsiento}, ${cuentaMercaderias}, 0, ${data.total_costo})
    `
  }
}

export async function deleteVenta(idMovimiento: number) {
  try {
    // 1. Get movement details to restore stock
    const detalles = await sql`
      SELECT md.id_producto, md.cantidad, p.stock_actual, p.categoria
      FROM movimientos_detalle md
      JOIN productos p ON p.id_producto = md.id_producto
      WHERE md.id_movimiento = ${idMovimiento}
    `

    // 2. Restore stock for each product (excepto ropa, que tiene stock ilimitado)
    for (const detalle of detalles) {
      if (detalle.categoria === "Ropa") {
        continue
      }
      const stockNuevo = Number(detalle.stock_actual) + Number(detalle.cantidad)

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

    revalidatePath("/ventas")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting venta:", error)
    return { success: false, error: error.message || "Error al eliminar la venta" }
  }
}
