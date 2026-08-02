import { type NextRequest, NextResponse } from "next/server"
import { interpretarVentas, interpretarCompras } from "@/lib/interpretar-pedido"

export async function POST(request: NextRequest) {
  try {
    const { tipo, texto, fecha } = await request.json()

    if (!texto || !fecha) {
      return NextResponse.json({ error: "Faltan 'texto' o 'fecha'" }, { status: 400 })
    }

    if (tipo === "ventas") {
      const pedidos = await interpretarVentas(texto, fecha)
      return NextResponse.json({ pedidos })
    }

    if (tipo === "compras") {
      const pedidos = await interpretarCompras(texto, fecha)
      return NextResponse.json({ pedidos })
    }

    return NextResponse.json({ error: "El campo 'tipo' debe ser 'ventas' o 'compras'" }, { status: 400 })
  } catch (error: any) {
    console.error("[v0] Error interpretando pedido pegado:", error)
    return NextResponse.json({ error: error.message || "Error al interpretar el texto" }, { status: 500 })
  }
}
