"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveProduct(formData: FormData, productId?: number) {
  try {
    const data = {
      codigo_sku: formData.get("codigo_sku") as string,
      descripcion: formData.get("descripcion") as string,
      marca: (formData.get("marca") as string) || null,
      modelo: (formData.get("modelo") as string) || null,
      categoria: (formData.get("categoria") as string) || "Zapatillas",
      talle: (formData.get("talle") as string) || null,
      color: (formData.get("color") as string) || null,
      costo: Number.parseFloat(formData.get("costo") as string) || 0,
      stock_actual: Number.parseInt(formData.get("stock_actual") as string, 10) || 0,
      stock_minimo: Number.parseInt(formData.get("stock_minimo") as string, 10) || 0,
    }

    if (isNaN(data.costo)) data.costo = 0
    if (isNaN(data.stock_actual)) data.stock_actual = 0
    if (isNaN(data.stock_minimo)) data.stock_minimo = 0

    if (productId) {
      await sql`
        UPDATE productos SET
          codigo_sku = ${data.codigo_sku},
          descripcion = ${data.descripcion},
          marca = ${data.marca},
          modelo = ${data.modelo},
          categoria = ${data.categoria},
          talle = ${data.talle},
          color = ${data.color},
          costo = ${data.costo},
          stock_actual = ${data.stock_actual},
          stock_minimo = ${data.stock_minimo},
          updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = ${productId}
      `
    } else {
      await sql`
        INSERT INTO productos (codigo_sku, descripcion, marca, modelo, categoria, talle, color, costo, stock_actual, stock_minimo)
        VALUES (${data.codigo_sku}, ${data.descripcion}, ${data.marca}, ${data.modelo}, ${data.categoria}, ${data.talle}, ${data.color}, ${data.costo}, ${data.stock_actual}, ${data.stock_minimo})
      `
    }

    revalidatePath("/productos")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error saving product:", error)
    if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
      return { success: false, error: "El código SKU ya existe" }
    }
    return { success: false, error: "Error al guardar el producto" }
  }
}

interface ProductData {
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
}

export async function saveMultipleProducts(productos: ProductData[]) {
  try {
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const producto of productos) {
      try {
        // Verificar si ya existe el SKU
        const existing = await sql`
          SELECT id_producto FROM productos WHERE codigo_sku = ${producto.codigo_sku}
        `

        if (existing.length > 0) {
          skipped++
          continue
        }

        await sql`
          INSERT INTO productos (codigo_sku, descripcion, marca, modelo, categoria, talle, color, costo, stock_actual, stock_minimo)
          VALUES (
            ${producto.codigo_sku}, 
            ${producto.descripcion}, 
            ${producto.marca}, 
            ${producto.modelo},
            ${producto.categoria}, 
            ${producto.talle}, 
            ${producto.color}, 
            ${producto.costo}, 
            ${producto.stock_actual}, 
            ${producto.stock_minimo}
          )
        `
        created++
      } catch (err: any) {
        console.error("[v0] Error inserting product:", producto.codigo_sku, err)
        if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
          skipped++
        } else {
          errors.push(producto.codigo_sku)
        }
      }
    }

    revalidatePath("/productos")

    if (errors.length > 0) {
      return {
        success: false,
        error: `Error al crear algunos productos: ${errors.join(", ")}`,
        created,
        skipped,
      }
    }

    return {
      success: true,
      created,
      skipped,
      message: skipped > 0 ? `${skipped} producto(s) ya existían y fueron omitidos` : undefined,
    }
  } catch (error: any) {
    console.error("[v0] Error saving multiple products:", error)
    return { success: false, error: "Error al guardar los productos", created: 0 }
  }
}

export async function deleteProduct(productId: number) {
  try {
    if (!productId || isNaN(productId)) {
      return { success: false, error: "ID de producto inválido" }
    }

    await sql`UPDATE productos SET activo = false WHERE id_producto = ${productId}`
    revalidatePath("/productos")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting product:", error)
    return { success: false, error: "Error al eliminar el producto" }
  }
}

export async function deleteProductsByFilter(filter: { marca?: string; modelo?: string; color?: string }) {
  try {
    let query = "UPDATE productos SET activo = false WHERE 1=1"
    const params: any[] = []

    if (filter.marca) {
      params.push(filter.marca)
      query += ` AND marca = $${params.length}`
    }
    if (filter.modelo) {
      params.push(filter.modelo)
      query += ` AND categoria = $${params.length}`
    }
    if (filter.color) {
      params.push(filter.color)
      query += ` AND color = $${params.length}`
    }

    if (params.length === 0) {
      return { success: false, error: "Debe especificar al menos un filtro" }
    }

    // Contar productos afectados primero
    const countResult = await sql`
      SELECT COUNT(*) as count FROM productos 
      WHERE activo = true 
        AND (${filter.marca}::text IS NULL OR marca = ${filter.marca})
        AND (${filter.modelo}::text IS NULL OR categoria = ${filter.modelo})
        AND (${filter.color}::text IS NULL OR color = ${filter.color})
    `

    const count = countResult[0]?.count || 0

    // Desactivar productos
    await sql`
      UPDATE productos SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE activo = true 
        AND (${filter.marca}::text IS NULL OR marca = ${filter.marca})
        AND (${filter.modelo}::text IS NULL OR categoria = ${filter.modelo})
        AND (${filter.color}::text IS NULL OR color = ${filter.color})
    `

    revalidatePath("/productos")
    return { success: true, deleted: count }
  } catch (error) {
    console.error("[v0] Error deleting products by filter:", error)
    return { success: false, error: "Error al eliminar los productos" }
  }
}

export async function hardDeleteProduct(productId: number) {
  try {
    if (!productId || isNaN(productId)) {
      return { success: false, error: "ID de producto inválido" }
    }

    // Verificar que no tenga movimientos de stock
    const movements = await sql`
      SELECT COUNT(*) as count FROM stock_movimientos WHERE id_producto = ${productId}
    `

    if (movements[0]?.count > 0) {
      return {
        success: false,
        error: "No se puede eliminar permanentemente un producto con movimientos de stock. Use la eliminación lógica.",
      }
    }

    await sql`DELETE FROM productos WHERE id_producto = ${productId}`
    revalidatePath("/productos")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error hard deleting product:", error)
    return { success: false, error: "Error al eliminar el producto" }
  }
}
