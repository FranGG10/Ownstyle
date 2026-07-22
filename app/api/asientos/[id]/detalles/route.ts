import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const numericId = Number.parseInt(id, 10)
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const detalles = await sql`
      SELECT ad.*, pc.codigo, pc.nombre
      FROM asientos_detalle ad
      JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE ad.id_asiento = ${numericId}
      ORDER BY ad.id_asiento_detalle
    `
    return NextResponse.json(detalles)
  } catch (error) {
    console.error("[v0] Error fetching asiento details:", error)
    return NextResponse.json({ error: "Error fetching details" }, { status: 500 })
  }
}
