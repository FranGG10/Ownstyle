"use client"

import Link from "next/link"
import useSWR from "swr"
import { Star } from "lucide-react"
import { IndicatorCard, type Indicator } from "@/components/indicadores/indicator-card"
import { fechaAISO } from "@/lib/format"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Preferencia {
  indicadorCodigo: string
  esFavorito: boolean
  orden: number
}

export function FavoritosIndicadores() {
  const desde = fechaAISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const hasta = fechaAISO(new Date())

  const { data: prefsData, isLoading: loadingPrefs } = useSWR("/api/dashboard-preferences", fetcher)
  const { data: resumenData } = useSWR(`/api/indicadores/resumen?from=${desde}&to=${hasta}`, fetcher)

  const preferencias: Preferencia[] = prefsData?.preferences || []
  const indicators: Indicator[] = resumenData?.indicators || []

  const favoritos = preferencias.filter((p) => p.esFavorito).sort((a, b) => a.orden - b.orden)
  const cards = favoritos
    .map((p) => indicators.find((i) => i.code === p.indicadorCodigo))
    .filter((i): i is Indicator => Boolean(i))

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        Indicadores Favoritos
      </h2>

      {loadingPrefs ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Marcá tus indicadores favoritos en la{" "}
          <Link href="/indicadores" className="font-medium text-primary underline-offset-2 hover:underline">
            sección Indicadores
          </Link>{" "}
          para verlos acá.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((ind) => (
            <IndicatorCard key={ind.code} indicator={ind} />
          ))}
        </div>
      )}
    </section>
  )
}
