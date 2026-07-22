import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { skus } = await request.json()

    if (!skus || skus.length === 0) {
      return NextResponse.json([])
    }

    const productos = await sql`
      SELECT id_producto, codigo_sku as sku, descripcion as nombre, costo, stock_actual
      FROM productos
      WHERE LOWER(codigo_sku) = ANY(${skus.map((s: string) => s.toLowerCase())})
    `

    return NextResponse.json(productos)
  } catch (error: any) {
    console.error("Error buscando SKUs:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
