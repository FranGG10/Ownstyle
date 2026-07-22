import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const sql = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(request.url)
  const idCuenta = searchParams.get("id_cuenta")

  if (!idCuenta) {
    return NextResponse.json({ error: "id_cuenta es requerido" }, { status: 400 })
  }

  try {
    const movimientos = await sql`
      SELECT 
        ad.id_asiento_detalle,
        a.id_asiento,
        a.fecha,
        a.descripcion,
        ad.debe,
        ad.haber
      FROM asientos_detalle ad
      JOIN asientos a ON ad.id_asiento = a.id_asiento
      WHERE ad.id_cuenta = ${idCuenta}
      ORDER BY a.fecha DESC, a.id_asiento DESC
    `

    return NextResponse.json({ movimientos })
  } catch (error: any) {
    console.error("Error obteniendo detalle cuenta:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
