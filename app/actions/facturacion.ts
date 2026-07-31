"use server"

import { revalidatePath } from "next/cache"
import { emitirFactura } from "@/lib/arca-facturacion"

export async function facturarVenta(idMovimiento: number) {
  const resultado = await emitirFactura(idMovimiento)

  revalidatePath("/ventas")
  revalidatePath(`/ventas/detalle/${idMovimiento}`)

  return resultado
}

// Se factura de a una y en orden (no en paralelo): ARCA asigna el número de
// comprobante en forma estrictamente secuencial por punto de venta, así que
// dos requests en simultáneo pueden pisarse el número.
export async function facturarVentasLote(idsMovimiento: number[]) {
  const resultados: Record<number, Awaited<ReturnType<typeof emitirFactura>>> = {}

  for (const id of idsMovimiento) {
    resultados[id] = await emitirFactura(id)
  }

  revalidatePath("/ventas")

  return resultados
}
