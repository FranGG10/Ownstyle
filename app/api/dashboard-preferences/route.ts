import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("Database URL not configured")
  return neon(databaseUrl)
}

// Preferencias de favoritos de indicadores (qué se muestra en el Dashboard).
export async function GET() {
  try {
    const sql = getSQL()
    const preferences = await sql`
      SELECT indicador_codigo as "indicadorCodigo", es_favorito as "esFavorito", orden
      FROM preferencias_dashboard
      ORDER BY orden ASC
    `
    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error("[v0] Error fetching dashboard-preferences:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sql = getSQL()
    const body = await request.json()
    const { indicadorCodigo, esFavorito, orden } = body

    if (!indicadorCodigo || typeof esFavorito !== "boolean") {
      return NextResponse.json({ error: "indicadorCodigo y esFavorito son requeridos" }, { status: 400 })
    }

    const [preference] = await sql`
      INSERT INTO preferencias_dashboard (indicador_codigo, es_favorito, orden)
      VALUES (${indicadorCodigo}, ${esFavorito}, ${orden ?? 0})
      ON CONFLICT (indicador_codigo)
      DO UPDATE SET es_favorito = ${esFavorito}, orden = ${orden ?? 0}, updated_at = CURRENT_TIMESTAMP
      RETURNING indicador_codigo as "indicadorCodigo", es_favorito as "esFavorito", orden
    `

    return NextResponse.json({ preference })
  } catch (error: any) {
    console.error("[v0] Error updating dashboard-preferences:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
