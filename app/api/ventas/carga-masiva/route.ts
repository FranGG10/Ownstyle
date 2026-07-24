import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { notificarConsumoStockSindic } from "@/lib/sindic-stock"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { fecha, nombre, telefono, barrio, direccion, monto, medioPago, productos, numeroPedido, numeroComprobante: comprobanteCliente } = data

    if (!productos || productos.length === 0) {
      return NextResponse.json({ success: false, error: "No hay productos válidos" })
    }

    // 1. Obtener cliente genérico
    const [cliente] = await sql`
      SELECT id_cliente FROM clientes WHERE razon_social ILIKE '%Consumidor Final%' LIMIT 1
    `
    const idCliente = cliente?.id_cliente || 1

    // 2. Usar el número de comprobante asignado por el cliente, o generar uno nuevo
    let numeroComprobante = comprobanteCliente
    if (!numeroComprobante) {
      const [lastVenta] = await sql`
        SELECT numero_comprobante FROM movimientos 
        WHERE tipo = 'venta' AND numero_comprobante ~ '^V-[0-9]+$'
        ORDER BY CAST(SUBSTRING(numero_comprobante FROM 3) AS INTEGER) DESC 
        LIMIT 1
      `
      const lastNum = lastVenta?.numero_comprobante
        ? Number.parseInt(lastVenta.numero_comprobante.split("-")[1] || "0")
        : 0
      numeroComprobante = `V-${String(lastNum + 1).padStart(6, "0")}`
    }

    const observaciones = numeroPedido ? `Pedido: ${numeroPedido}` : "Carga masiva"

    // 3. Crear movimiento
    const [movimiento] = await sql`
      INSERT INTO movimientos (
        tipo, numero_comprobante, id_cliente, fecha, medio_pago,
        subtotal, iva, total, nombre_cliente, telefono, barrio, direccion,
        observaciones, estado
      )
      VALUES (
        'venta', ${numeroComprobante}, ${idCliente}, ${fecha}, ${medioPago},
        ${monto}, 0, ${monto}, 
        ${nombre || null}, ${telefono || null}, ${barrio || null}, ${direccion || null},
        ${observaciones}, 'completado'
      )
      RETURNING id_movimiento
    `

    const idMovimiento = movimiento.id_movimiento
    let totalCosto = 0

    // 4. Crear detalles y actualizar stock
    for (const producto of productos) {
      // Calcular precio unitario como el monto total dividido cantidad de productos
      const precioUnitario = monto / productos.length

      await sql`
        INSERT INTO movimientos_detalle (id_movimiento, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (${idMovimiento}, ${producto.id_producto}, 1, ${precioUnitario}, ${precioUnitario})
      `

      // Obtener stock actual
      const [productoDb] = await sql`
        SELECT stock_actual, costo, categoria, modelo, color, talle FROM productos WHERE id_producto = ${producto.id_producto}
      `
      const costo = Number(productoDb?.costo) || 0
      totalCosto += costo

      // Los productos de categoria "Ropa" tienen stock ilimitado acá: no se descuenta stock
      // local ni se registra movimiento de stock, pero sí se genera el asiento de venta y CMV
      // (igual que en app/actions/ventas.ts). El stock físico de esta ropa vive en Sindic, así
      // que se le avisa por API para que descuente ahí; si Sindic no responde no debe frenar
      // la carga masiva.
      if (productoDb?.categoria === "Ropa") {
        await notificarConsumoStockSindic({
          modelo: productoDb.modelo,
          color: productoDb.color,
          talla: productoDb.talle,
          quantity: 1,
          reference: numeroComprobante,
        })
        continue
      }

      const stockAnterior = productoDb?.stock_actual || 0
      const stockNuevo = stockAnterior - 1

      // Actualizar stock
      await sql`
        UPDATE productos
        SET stock_actual = ${stockNuevo}, updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${producto.id_producto}
      `

      // Crear movimiento de stock
      await sql`
        INSERT INTO stock_movimientos (id_producto, id_movimiento, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${producto.id_producto}, ${idMovimiento}, 'salida', 1, ${stockAnterior}, ${stockNuevo}, ${"Venta " + numeroComprobante})
      `
    }

    // 5. Crear asiento contable
    const cuentaPago = medioPago === "transferencia" ? "1.1.2" : "1.1.1"

    const cuentas = await sql`
      SELECT codigo, id_cuenta FROM plan_cuentas 
      WHERE codigo IN (${cuentaPago}, '4.1', '5.1', '1.1.3')
    `

    const getCuentaId = (codigo: string) => cuentas.find((c) => c.codigo === codigo)?.id_cuenta

    const cuentaCajaBanco = getCuentaId(cuentaPago)
    const cuentaVentas = getCuentaId("4.1")
    const cuentaCMV = getCuentaId("5.1")
    const cuentaMercaderias = getCuentaId("1.1.3")

    const descripcionPago = medioPago === "transferencia" ? "Banco" : "Caja"

    const [asiento] = await sql`
      INSERT INTO asientos (id_movimiento, fecha, descripcion)
      VALUES (${idMovimiento}, ${fecha}, ${"Venta " + numeroComprobante + " - " + descripcionPago})
      RETURNING id_asiento
    `

    const idAsiento = asiento.id_asiento

    // DEBE: Caja o Banco
    if (cuentaCajaBanco) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaCajaBanco}, ${monto}, 0)
      `
    }

    // HABER: Ventas
    if (cuentaVentas) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaVentas}, 0, ${monto})
      `
    }

    // DEBE: CMV
    if (cuentaCMV) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaCMV}, ${totalCosto}, 0)
      `
    }

    // HABER: Mercaderías
    if (cuentaMercaderias) {
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${idAsiento}, ${cuentaMercaderias}, 0, ${totalCosto})
      `
    }

    revalidatePath("/ventas")
    revalidatePath("/productos")
    revalidatePath("/contabilidad")
    revalidatePath("/")

    return NextResponse.json({ success: true, comprobante: numeroComprobante })
  } catch (error: any) {
    console.error("Error en carga masiva:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
