// Avisa a Sindic (sistema aparte que lleva el stock físico real de la ropa) que se vendió
// una prenda acá, para que descuente su stock. No genera ningún asiento en Sindic — solo
// mueve stock allá. Si Sindic no responde o falla, no debe frenar la venta en Ownstyle:
// se loguea el error y listo (la venta ya quedó registrada acá de todos modos).
// Usado tanto por la carga de venta individual (app/actions/ventas.ts) como por la carga
// masiva (app/api/ventas/carga-masiva/route.ts) — cualquier lugar que venda un producto
// de categoría "Ropa" tiene que llamar esto.
export async function notificarConsumoStockSindic(item: {
  modelo: string | null
  color: string | null
  talla: string | null
  quantity: number
  reference: string
}) {
  const baseUrl = process.env.SINDIC_API_URL
  const apiKey = process.env.SINDIC_API_KEY

  if (!baseUrl || !apiKey) {
    console.error("[v0] SINDIC_API_URL o SINDIC_API_KEY no configurados; no se pudo avisar el consumo de stock")
    return
  }

  try {
    const response = await fetch(`${baseUrl}/api/stock/consumo-externo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        source: "ownstyle",
        reference: item.reference,
        items: [
          {
            modelo: item.modelo,
            color: item.color,
            talla: item.talla,
            quantity: item.quantity,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error("[v0] Sindic respondió con error al descontar stock:", response.status, await response.text())
    }
  } catch (error) {
    console.error("[v0] No se pudo contactar a Sindic para descontar stock:", error)
  }
}
