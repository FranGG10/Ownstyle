import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const [lastCompra] = await sql`
      SELECT numero_comprobante FROM movimientos 
      WHERE tipo = 'compra' AND numero_comprobante ~ '^C-[0-9]+$'
      ORDER BY CAST(SUBSTRING(numero_comprobante FROM 3) AS INTEGER) DESC 
      LIMIT 1
    `
    const lastNum = lastCompra?.numero_comprobante
      ? Number.parseInt(lastCompra.numero_comprobante.split("-")[1] || "0")
      : 0

    return NextResponse.json({ lastNum })
  } catch (error: any) {
    return NextResponse.json({ lastNum: 0 })
  }
}
