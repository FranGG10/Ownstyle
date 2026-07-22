import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { fecha, proveedor, medioPago, productos, numeroPedido, numeroComprobante: comprobanteCliente, total } = data

    if (!productos || productos.length === 0) {
      return NextResponse.json({ success: false, error: "No hay productos validos" })
    }

    // 1. Buscar proveedor por nombre
    let idProveedor = null
    if (proveedor) {
      const [prov] = await sql`
        SELECT id_proveedor FROM proveedores WHERE razon_social ILIKE ${"%" + proveedor + "%"} LIMIT 1
      `
      idProveedor = prov?.id_proveedor || null
    }

    // 2. Usar el comprobante asignado o generar uno nuevo
    let numeroComprobante = comprobanteCliente
    if (!numeroComprobante) {
      const [lastCompra] = await sql`
        SELECT numero_comprobante FROM movimientos 
        WHERE tipo = 'compra' AND numero_comprobante ~ '^C-[0-9]+$'
        ORDER BY CAST(SUBSTRING(numero_comprobante FROM 3) AS INTEGER) DESC 
        LIMIT 1
      `
      const lastNum = lastCompra?.numero_comprobante
        ? Number.parseInt(lastCompra.numero_comprobante.split("-")[1] || "0")
        : 0
      numeroComprobante = `C-${String(lastNum + 1).padStart(6, "0")}`
    }

    // 3. Calcular total basado en costo * cantidad
    const totalCompra = total || productos.reduce((sum: number, p: any) => sum + (p.costo * p.cantidad), 0)

    const observaciones = numeroPedido ? `Pedido: ${numeroPedido}` : "Carga masiva"

    // 4. Crear movimiento
    const [movimiento] = await sql`
      INSERT INTO movimientos (
        tipo, numero_comprobante, id_proveedor, fecha, medio_pago,
        subtotal, iva, total, observaciones, estado
      )
      VALUES (
        'compra', ${numeroComprobante}, ${idProveedor}, ${fecha}, ${medioPago},
        ${totalCompra}, 0, ${totalCompra}, ${observaciones}, 'completado'
      )
      RETURNING id_movimiento
    `

    const idMovimiento = movimiento.id_movimiento

    // 5. Crear detalles y actualizar stock
    for (const producto of productos) {
      const subtotalLinea = producto.costo * producto.cantidad

      await sql`
        INSERT INTO movimientos_detalle (id_movimiento, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (${idMovimiento}, ${producto.id_producto}, ${producto.cantidad}, ${producto.costo}, ${subtotalLinea})
      `

      // Obtener stock actual
      const [productoDb] = await sql`
        SELECT stock_actual FROM productos WHERE id_producto = ${producto.id_producto}
      `
      const stockAnterior = productoDb?.stock_actual || 0
      const stockNuevo = stockAnterior + producto.cantidad

      // Actualizar stock
      await sql`
        UPDATE productos 
        SET stock_actual = ${stockNuevo}, updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${producto.id_producto}
      `

      // Crear movimiento de stock
      await sql`
        INSERT INTO stock_movimientos (id_producto, id_movimiento, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${producto.id_producto}, ${idMovimiento}, 'entrada', ${producto.cantidad}, ${stockAnterior}, ${stockNuevo}, ${"Compra " + numeroComprobante})
      `
    }

    // 6. Crear asiento contable
    const cuentaPago = medioPago === "transferencia" ? "1.1.2" : "1.1.1"

    const cuentas = await sql`
      SELECT codigo, id_cuenta FROM plan_cuentas 
      WHERE codigo IN (${cuentaPago}, '1.1.3')
    `

    const getCuentaId = (codigo: string) => cuentas.find((c) => c.codigo === codigo)?.id_cuenta

    const cuentaMercaderias = getCuentaId("1.1.3")
    const cuentaSalida = getCuentaId(cuentaPago)
    const descripcionPago = medioPago === "transferencia" ? "Banco" : "Caja"

    const [asiento] = await sql`
      INSERT INTO asientos (id_movimiento, fecha, descripcion)
      VALUES (${idMovimiento}, ${fecha}, ${"Compra " + numeroComprobante + " - Pago " + descripcionPago})
      RETURNING id_asiento
    `

    const idAsiento = asiento.id_asiento

    // DEBE: Mercaderias
    if (cuentaMercaderias) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaMercaderias}, ${totalCompra}, 0)
      `
    }

    // HABER: Caja o Banco
    if (cuentaSalida) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaSalida}, 0, ${totalCompra})
      `
    }

    revalidatePath("/compras")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return NextResponse.json({ success: true, comprobante: numeroComprobante })
  } catch (error: any) {
    console.error("Error en carga masiva compras:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
