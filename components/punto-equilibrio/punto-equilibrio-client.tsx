"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Scale, TrendingUp, TrendingDown, Percent, Wallet, Calendar } from "lucide-react"
import { formatCurrency, fechaAISO } from "@/lib/format"
import { CvpChart } from "./cvp-chart"
import { CostosDetalle } from "./costos-detalle"
import { ComparacionPeriodo } from "./comparacion-periodo"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ESTADO_INFO: Record<string, { label: string; className: string }> = {
  rentable: { label: "Rentable", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0" },
  empate: { label: "En Equilibrio", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0" },
  pierde: { label: "Por Debajo del Equilibrio", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0" },
  sin_datos: { label: "Sin Datos Suficientes", className: "text-muted-foreground" },
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function PuntoEquilibrioClient() {
  const [desde, setDesde] = useState(() => fechaAISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [hasta, setHasta] = useState(() => fechaAISO(new Date()))

  const setPeriodoRapido = (tipo: "mes" | "trimestre" | "año") => {
    const hoy = new Date()
    const inicio = new Date()
    if (tipo === "mes") inicio.setDate(1)
    if (tipo === "trimestre") inicio.setMonth(hoy.getMonth() - 2, 1)
    if (tipo === "año") inicio.setMonth(0, 1)
    setDesde(fechaAISO(inicio))
    setHasta(fechaAISO(hoy))
  }

  const { data, isLoading, error } = useSWR(`/api/punto-equilibrio?from=${desde}&to=${hasta}`, fetcher)

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Punto de Equilibrio</h1>
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (error || data?.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Punto de Equilibrio</h1>
        <Card>
          <CardContent className="p-6 text-center text-red-500">
            Error al cargar: {data?.error || error?.message}
          </CardContent>
        </Card>
      </div>
    )
  }

  const actual = data.actual
  const anterior = { ...data.anterior }
  const estadoInfo = ESTADO_INFO[actual.estado] ?? ESTADO_INFO.sin_datos

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Punto de Equilibrio
          </h1>
          <p className="text-sm text-muted-foreground">
            Calculado con la información cargada en el sistema (ventas, costo de mercadería y gastos).
          </p>
        </div>
        <Badge className={estadoInfo.className} variant="outline">
          {estadoInfo.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("mes")}>
          Este Mes
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("trimestre")}>
          Último Trimestre
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("año")}>
          Este Año
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas del Período" value={formatCurrency(actual.ventas)} icon={TrendingUp} />
        <StatCard label="Ventas de Equilibrio" value={formatCurrency(actual.ventasEquilibrio)} icon={Scale} />
        <StatCard label="Margen de Contribución %" value={`${actual.margenContribucionPct.toFixed(1)}%`} icon={Percent} />
        <StatCard
          label="Resultado"
          value={formatCurrency(actual.resultado)}
          icon={actual.resultado >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <CvpChart
            ventas={actual.ventas}
            costosFijos={actual.costosFijos.total}
            costosVariables={actual.costosVariables.total}
            ventasEquilibrio={actual.ventasEquilibrio}
            estado={actual.estado}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostosDetalle
          titulo="Costos Fijos"
          total={actual.costosFijos.total}
          detalle={actual.costosFijos.detalle}
          ventas={actual.ventas}
          colorClass="bg-orange-500"
        />
        <CostosDetalle
          titulo="Costos Variables"
          total={actual.costosVariables.total}
          detalle={actual.costosVariables.detalle}
          ventas={actual.ventas}
          colorClass="bg-red-500"
        />
      </div>

      <ComparacionPeriodo actual={actual} anterior={anterior} />
    </div>
  )
}
