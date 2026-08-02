import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("Database URL not configured")
  return neon(databaseUrl)
}

// Clasificación variable/fijo de una cuenta de gasto, para Márgenes de Contribución y
// Punto de Equilibrio (ver /api/indicadores/resumen y /api/punto-equilibrio).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getSQL()
    const { id } = await params
    const idCuenta = Number(id)
    const body = await request.json()
    const { comportamiento } = body

    if (!Number.isInteger(idCuenta)) {
      return NextResponse.json({ error: "id de cuenta inválido" }, { status: 400 })
    }
    if (comportamiento !== "variable" && comportamiento !== "fijo" && comportamiento !== null) {
      return NextResponse.json({ error: "comportamiento debe ser 'variable', 'fijo' o null" }, { status: 400 })
    }

    const [cuenta] = await sql`
      UPDATE plan_cuentas SET comportamiento = ${comportamiento} WHERE id_cuenta = ${idCuenta}
      RETURNING id_cuenta, codigo, comportamiento
    `

    if (!cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ cuenta })
  } catch (error: any) {
    console.error("[v0] Error updating plan_cuentas.comportamiento:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
