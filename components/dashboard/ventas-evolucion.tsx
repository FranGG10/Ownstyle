"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatCurrency, fechaAISO } from "@/lib/format"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Granularidad = "day" | "month" | "year"

interface PuntoSerie {
  period: string
  totalFacturado: number
  cantidadVentas: number
}

const GRANULARIDADES: { value: Granularidad; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
]

function formatEje(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${Math.round(value)}`
}

function formatPeriodo(period: string, granularidad: Granularidad): string {
  const d = new Date(period)
  if (granularidad === "year") return d.getUTCFullYear().toString()
  if (granularidad === "month")
    return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" })
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
}

export function VentasEvolucionChart() {
  const [granularidad, setGranularidad] = useState<Granularidad>("day")
  const [desde, setDesde] = useState(() => fechaAISO(new Date(Date.now() - 30 * 86_400_000)))
  const [hasta, setHasta] = useState(() => fechaAISO(new Date()))
  const [hover, setHover] = useState<number | null>(null)

  const { data, isLoading } = useSWR(
    `/api/reportes/ventas-evolucion?granularity=${granularidad}&from=${desde}&to=${hasta}`,
    fetcher,
  )

  const serie: PuntoSerie[] = data?.serie ?? []
  const maxValor = useMemo(() => Math.max(0, ...serie.map((p) => p.totalFacturado)), [serie])
  const lineasGuia = [1, 0.75, 0.5, 0.25, 0]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolución de Ventas
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Total facturado por período seleccionado.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2">
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-36" />
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-36" />
            </div>
            <div
              role="tablist"
              aria-label="Granularidad"
              className="inline-flex rounded-md border border-input bg-muted/50 p-0.5"
            >
              {GRANULARIDADES.map((g) => {
                const activo = granularidad === g.value
                return (
                  <button
                    key={g.value}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setGranularidad(g.value)}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      activo ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded bg-muted" />
        ) : serie.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay ventas registradas en el período seleccionado.
          </p>
        ) : (
          <div className="flex gap-3">
            <div className="flex h-64 w-14 shrink-0 flex-col justify-between py-1 text-right text-[11px] tabular-nums text-muted-foreground">
              {lineasGuia.map((g) => (
                <span key={g}>{formatEje(maxValor * g)}</span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              <div className="absolute inset-0 flex flex-col justify-between">
                {lineasGuia.map((g) => (
                  <div key={g} className="border-t border-dashed border-border/70" />
                ))}
              </div>

              <div className="relative flex h-64 items-end gap-1.5">
                {serie.map((p, i) => {
                  const heightPct = maxValor > 0 ? (p.totalFacturado / maxValor) * 100 : 0
                  const activo = hover === i
                  return (
                    <div
                      key={`${p.period}-${i}`}
                      className="group relative flex h-full flex-1 flex-col justify-end"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {activo && (
                        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-foreground">{formatPeriodo(p.period, granularidad)}</p>
                          <p className="mt-0.5 text-primary">{formatCurrency(p.totalFacturado)}</p>
                          <p className="text-muted-foreground">
                            {p.cantidadVentas} {p.cantidadVentas === 1 ? "venta" : "ventas"}
                          </p>
                        </div>
                      )}
                      <div
                        className={`w-full rounded-t transition-colors ${activo ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ height: `${Math.max(heightPct, p.totalFacturado > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-2 flex gap-1.5">
                {serie.map((p, i) => (
                  <span
                    key={`label-${p.period}-${i}`}
                    className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground"
                    title={formatPeriodo(p.period, granularidad)}
                  >
                    {formatPeriodo(p.period, granularidad)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
