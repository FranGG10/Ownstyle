"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

interface CambioDetalle {
  id_producto_entregado: number
  id_producto_recibido: number
}

interface CambioData {
  fecha: string
  id_cliente?: number
  nombre_cliente?: string
  telefono?: string
  motivo: string
  detalles: CambioDetalle[]
  observaciones?: string
}

export async function createCambio(data: CambioData) {
  try {
    // Usar el primer par para mantener compatibilidad con la tabla principal
    const primerDetalle = data.detalles[0]

    // 1. Crear el registro del cambio
    const [cambio] = await sql`
      INSERT INTO cambios (
        fecha, id_cliente, nombre_cliente, telefono, motivo, 
        estado, id_producto_entregado, id_producto_recibido, observaciones
      )
      VALUES (
        ${data.fecha}, 
        ${data.id_cliente || null}, 
        ${data.nombre_cliente || null}, 
        ${data.telefono || null}, 
        ${data.motivo},
        'pendiente',
        ${primerDetalle.id_producto_entregado},
        ${primerDetalle.id_producto_recibido},
        ${data.observaciones || null}
      )
      RETURNING id_cambio
    `

    const idCambio = cambio.id_cambio

    // 2. Insertar todos los detalles y actualizar stock
    for (const detalle of data.detalles) {
      // Insertar detalle
      await sql`
        INSERT INTO cambios_detalle (id_cambio, id_producto_entregado, id_producto_recibido)
        VALUES (${idCambio}, ${detalle.id_producto_entregado}, ${detalle.id_producto_recibido})
      `

      // Descontar stock del producto ENTREGADO
      const [productoEntregado] = await sql`
        SELECT stock_actual FROM productos WHERE id_producto = ${detalle.id_producto_entregado}
      `
      const stockAnteriorEntregado = productoEntregado.stock_actual
      const stockNuevoEntregado = stockAnteriorEntregado - 1

      await sql`
        UPDATE productos 
        SET stock_actual = ${stockNuevoEntregado}
        WHERE id_producto = ${detalle.id_producto_entregado}
      `

      await sql`
        INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${detalle.id_producto_entregado}, 'salida', 1, ${stockAnteriorEntregado}, ${stockNuevoEntregado}, ${`Cambio #${idCambio} - Producto entregado`})
      `
    }

    revalidatePath("/cambios")
    revalidatePath("/productos")
    revalidatePath("/")

    return { success: true, id: idCambio }
  } catch (error: any) {
    console.error("Error creating cambio:", error)
    return { success: false, error: error.message || "Error al crear el cambio" }
  }
}

export async function completarCambio(idCambio: number) {
  try {
    const [cambio] = await sql`
      SELECT * FROM cambios WHERE id_cambio = ${idCambio}
    `

    if (!cambio) {
      return { success: false, error: "Cambio no encontrado" }
    }

    if (cambio.estado === "completado") {
      return { success: false, error: "El cambio ya esta completado" }
    }

    // Obtener todos los detalles del cambio
    const detalles = await sql`
      SELECT * FROM cambios_detalle WHERE id_cambio = ${idCambio}
    `

    // Si hay detalles en la tabla nueva, usar esos
    if (detalles.length > 0) {
      for (const detalle of detalles) {
        const [productoRecibido] = await sql`
          SELECT stock_actual FROM productos WHERE id_producto = ${detalle.id_producto_recibido}
        `
        const stockAnterior = productoRecibido.stock_actual
        const stockNuevo = stockAnterior + 1

        await sql`
          UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${detalle.id_producto_recibido}
        `

        await sql`
          INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES (${detalle.id_producto_recibido}, 'entrada', 1, ${stockAnterior}, ${stockNuevo}, ${`Cambio #${idCambio} - Producto recibido`})
        `
      }
    } else {
      // Fallback: usar los campos de la tabla principal (cambios viejos)
      const [productoRecibido] = await sql`
        SELECT stock_actual FROM productos WHERE id_producto = ${cambio.id_producto_recibido}
      `
      const stockAnterior = productoRecibido.stock_actual
      const stockNuevo = stockAnterior + 1

      await sql`
        UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${cambio.id_producto_recibido}
      `

      await sql`
        INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (${cambio.id_producto_recibido}, 'entrada', 1, ${stockAnterior}, ${stockNuevo}, ${`Cambio #${idCambio} - Producto recibido`})
      `
    }

    await sql`
      UPDATE cambios SET estado = 'completado' WHERE id_cambio = ${idCambio}
    `

    revalidatePath("/cambios")
    revalidatePath("/productos")
    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("Error completing cambio:", error)
    return { success: false, error: error.message || "Error al completar el cambio" }
  }
}

export async function eliminarCambio(idCambio: number) {
  try {
    const [cambio] = await sql`
      SELECT * FROM cambios WHERE id_cambio = ${idCambio}
    `

    if (!cambio) {
      return { success: false, error: "Cambio no encontrado" }
    }

    // Obtener detalles del cambio
    const detalles = await sql`
      SELECT * FROM cambios_detalle WHERE id_cambio = ${idCambio}
    `

    // Revertir stock: devolver los productos que fueron entregados al cliente
    if (detalles.length > 0) {
      for (const detalle of detalles) {
        // Devolver stock del producto ENTREGADO (fue sacado del inventario al crear el cambio)
        const [productoEntregado] = await sql`
          SELECT stock_actual FROM productos WHERE id_producto = ${detalle.id_producto_entregado}
        `
        const stockAnterior = productoEntregado.stock_actual
        const stockNuevo = stockAnterior + 1

        await sql`
          UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${detalle.id_producto_entregado}
        `

        await sql`
          INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES (${detalle.id_producto_entregado}, 'entrada', 1, ${stockAnterior}, ${stockNuevo}, ${`Cambio #${idCambio} eliminado - Stock restaurado`})
        `

        // Si el cambio estaba completado, tambien revertir los productos recibidos
        if (cambio.estado === "completado") {
          const [productoRecibido] = await sql`
            SELECT stock_actual FROM productos WHERE id_producto = ${detalle.id_producto_recibido}
          `
          const stockAntRec = productoRecibido.stock_actual
          const stockNuevoRec = Math.max(0, stockAntRec - 1)

          await sql`
            UPDATE productos SET stock_actual = ${stockNuevoRec} WHERE id_producto = ${detalle.id_producto_recibido}
          `

          await sql`
            INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
            VALUES (${detalle.id_producto_recibido}, 'salida', 1, ${stockAntRec}, ${stockNuevoRec}, ${`Cambio #${idCambio} eliminado - Stock revertido`})
          `
        }
      }
    } else {
      // Fallback para cambios viejos sin detalles
      if (cambio.id_producto_entregado) {
        const [pe] = await sql`
          SELECT stock_actual FROM productos WHERE id_producto = ${cambio.id_producto_entregado}
        `
        const stockAnt = pe.stock_actual
        const stockNuevo = stockAnt + 1

        await sql`UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${cambio.id_producto_entregado}`
        await sql`
          INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES (${cambio.id_producto_entregado}, 'entrada', 1, ${stockAnt}, ${stockNuevo}, ${`Cambio #${idCambio} eliminado - Stock restaurado`})
        `
      }

      if (cambio.estado === "completado" && cambio.id_producto_recibido) {
        const [pr] = await sql`
          SELECT stock_actual FROM productos WHERE id_producto = ${cambio.id_producto_recibido}
        `
        const stockAnt = pr.stock_actual
        const stockNuevo = Math.max(0, stockAnt - 1)

        await sql`UPDATE productos SET stock_actual = ${stockNuevo} WHERE id_producto = ${cambio.id_producto_recibido}`
        await sql`
          INSERT INTO stock_movimientos (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES (${cambio.id_producto_recibido}, 'salida', 1, ${stockAnt}, ${stockNuevo}, ${`Cambio #${idCambio} eliminado - Stock revertido`})
        `
      }
    }

    // Eliminar detalles y cambio
    await sql`DELETE FROM cambios_detalle WHERE id_cambio = ${idCambio}`
    await sql`DELETE FROM cambios WHERE id_cambio = ${idCambio}`

    revalidatePath("/cambios")
    revalidatePath("/productos")
    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("Error eliminando cambio:", error)
    return { success: false, error: error.message || "Error al eliminar el cambio" }
  }
}

export async function getCambios() {
  try {
    const cambios = await sql`
      SELECT 
        c.*,
        pe.descripcion as producto_entregado_nombre,
        pe.codigo_sku as producto_entregado_sku,
        pe.talle as producto_entregado_talle,
        pe.color as producto_entregado_color,
        pr.descripcion as producto_recibido_nombre,
        pr.codigo_sku as producto_recibido_sku,
        pr.talle as producto_recibido_talle,
        pr.color as producto_recibido_color,
        cl.razon_social as cliente_razon_social,
        (SELECT COUNT(*) FROM cambios_detalle WHERE id_cambio = c.id_cambio) as cantidad_pares
      FROM cambios c
      LEFT JOIN productos pe ON c.id_producto_entregado = pe.id_producto
      LEFT JOIN productos pr ON c.id_producto_recibido = pr.id_producto
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.created_at DESC
    `
    return cambios
  } catch (error) {
    console.error("Error fetching cambios:", error)
    return []
  }
}

export async function getDetallesCambio(idCambio: number) {
  try {
    const detalles = await sql`
      SELECT 
        cd.*,
        pe.descripcion as producto_entregado_nombre,
        pe.codigo_sku as producto_entregado_sku,
        pr.descripcion as producto_recibido_nombre,
        pr.codigo_sku as producto_recibido_sku
      FROM cambios_detalle cd
      LEFT JOIN productos pe ON cd.id_producto_entregado = pe.id_producto
      LEFT JOIN productos pr ON cd.id_producto_recibido = pr.id_producto
      WHERE cd.id_cambio = ${idCambio}
      ORDER BY cd.id_detalle
    `
    return detalles
  } catch (error) {
    console.error("Error fetching detalles cambio:", error)
    return []
  }
}
