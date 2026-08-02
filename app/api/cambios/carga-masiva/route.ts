import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { notificarConsumoStockSindic } from "@/lib/sindic-stock"

interface ParCambio {
  idProductoEntregado: number
  idProductoRecibido: number
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { fecha, nombreCliente, telefono, motivo, pares } = data as {
      fecha: string
      nombreCliente?: string
      telefono?: string
      motivo: string
      pares: ParCambio[]
    }

    if (!fecha || !motivo || !pares || pares.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Faltan datos obligatorios (fecha, motivo, o al menos un par entrega/devuelve)",
      })
    }

    if (pares.some((p) => !p.idProductoEntregado || !p.idProductoRecibido)) {
      return NextResponse.json({
        success: false,
        error: "Hay un par entrega/devuelve incompleto",
      })
    }

    // 1. Crear el cambio. Igual que la carga individual (app/actions/cambios.ts):
    // queda en estado 'pendiente' - el stock de la zapatilla que devuelve (recibida)
    // no se repone hasta que alguien complete el cambio manualmente. El primer par
    // se guarda también en las columnas viejas de `cambios` para compatibilidad,
    // igual que hace createCambio.
    const primerPar = pares[0]

    const [cambio] = await sql`
      INSERT INTO cambios (
        fecha, nombre_cliente, telefono, motivo,
        estado, id_producto_entregado, id_producto_recibido
      )
      VALUES (
        ${fecha}, ${nombreCliente || null}, ${telefono || null}, ${motivo},
        'pendiente', ${primerPar.idProductoEntregado}, ${primerPar.idProductoRecibido}
      )
      RETURNING id_cambio
    `

    const idCambio = cambio.id_cambio

    // 2. Insertar todos los pares y descontar stock de cada zapatilla ENTREGADA
    // (la que se lleva el cliente ahora). La devuelta no se toca hasta completar.
    for (const par of pares) {
      await sql`
        INSERT INTO cambios_detalle (id_cambio, id_producto_entregado, id_producto_recibido)
        VALUES (${idCambio}, ${par.idProductoEntregado}, ${par.idProductoRecibido})
      `

      const [productoEntregado] = await sql`
        SELECT stock_actual, categoria, modelo, color, talle FROM productos WHERE id_producto = ${par.idProductoEntregado}
      `

      if (!productoEntregado) {
        return NextResponse.json({ success: false, error: `La zapatilla entregada (id ${par.idProductoEntregado}) no existe` })
      }

      if (productoEntregado.categoria === "Ropa") {
        await notificarConsumoStockSindic({
          modelo: productoEntregado.modelo,
          color: productoEntregado.color,
          talla: productoEntregado.talle,
          quantity: 1,
          reference: `cambio-${idCambio}`,
        })
      } else {
        const stockAnterior = productoEntregado.stock_actual
        const stockNuevo = stockAnterior - 1

        await sql`
          UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${par.idProductoEntregado}
        `

        await sql`
          INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES (${par.idProductoEntregado}, 'salida', 1, ${stockAnterior}, ${stockNuevo}, ${`Cambio #${idCambio} (carga masiva) - Producto entregado`})
        `
      }
    }

    revalidatePath("/cambios")
    revalidatePath("/productos")
    revalidatePath("/")

    return NextResponse.json({ success: true, id: idCambio })
  } catch (error: any) {
    console.error("Error en carga masiva de cambios:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al crear el cambio" })
  }
}
