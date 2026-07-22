"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  RotateCw,
  Clock,
  BarChart3,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

function VariacionBadge({ valor, sinDatos }: { valor: number | null; sinDatos?: boolean }) {
  if (sinDatos || valor === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <Minus className="h-3 w-3" />
        Sin datos previos
      </Badge>
    )
  }
  if (valor >= 0) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 border-0">
        <TrendingUp className="h-3 w-3" />
        +{valor.toFixed(1)}%
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1 border-0">
      <TrendingDown className="h-3 w-3" />
      {valor.toFixed(1)}%
    </Badge>
  )
}

function RotacionIndicador({ valor }: { valor: number }) {
  let color = "text-emerald-600"
  let bgColor = "bg-emerald-100 dark:bg-emerald-900/30"
  let label = "Optimo"
  let icon = <CheckCircle className="h-4 w-4" />

  if (valor < 0.3) {
    color = "text-amber-600"
    bgColor = "bg-amber-100 dark:bg-amber-900/30"
    label = "Stock lento"
    icon = <AlertCircle className="h-4 w-4" />
  } else if (valor > 0.8 && valor <= 1.0) {
    color = "text-amber-600"
    bgColor = "bg-amber-100 dark:bg-amber-900/30"
    label = "Stock lento"
    icon = <AlertCircle className="h-4 w-4" />
  } else if (valor > 1.0) {
    color = "text-red-600"
    bgColor = "bg-red-100 dark:bg-red-900/30"
    label = "Posible quiebre"
    icon = <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${color}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function DiasStockIndicador({ valor }: { valor: number }) {
  let color = "text-emerald-600"
  let bgColor = "bg-emerald-100 dark:bg-emerald-900/30"
  let label = "Nivel adecuado"
  let icon = <CheckCircle className="h-4 w-4" />

  if (valor < 45) {
    color = "text-amber-600"
    bgColor = "bg-amber-100 dark:bg-amber-900/30"
    label = "Stock bajo"
    icon = <AlertCircle className="h-4 w-4" />
  } else if (valor > 120) {
    color = "text-red-600"
    bgColor = "bg-red-100 dark:bg-red-900/30"
    label = "Sobre stock"
    icon = <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${color}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function IndicadoresClient() {
  const { data, error, isLoading } = useSWR("/api/indicadores", fetcher)

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || data?.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Indicadores</h1>
        <Card>
          <CardContent className="p-6 text-center text-red-500">
            Error al cargar indicadores: {data?.error || error?.message}
          </CardContent>
        </Card>
      </div>
    )
  }

  const { ventas, unidades, margenBruto, rotacionStock, diasStock, topModelos, topModelosHistorico } = data

  const maxUnidadesMes = topModelos.length > 0 ? topModelos[0].unidadesVendidas : 1
  const maxUnidadesHist = topModelosHistorico.length > 0 ? topModelosHistorico[0].unidadesVendidas : 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <Badge variant="outline" className="text-muted-foreground">
          Datos del mes actual
        </Badge>
      </div>

      {/* Row 1: KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ventas del mes */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{formatCurrency(ventas.mesActual)}</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">vs. mes anterior</span>
                <VariacionBadge valor={ventas.variacionMensual} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">vs. mismo mes anio anterior</span>
                <VariacionBadge valor={ventas.variacionAnual} sinDatos />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mes anterior: {formatCurrency(ventas.mesPasado)}
            </p>
          </CardContent>
        </Card>

        {/* Unidades vendidas */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Unidades Vendidas del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{unidades.mesActual} <span className="text-lg font-normal text-muted-foreground">pares</span></p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">vs. mes anterior</span>
              <VariacionBadge valor={unidades.variacionMensual} />
            </div>
            <p className="text-xs text-muted-foreground">
              Mes anterior: {unidades.mesPasado} pares
            </p>
          </CardContent>
        </Card>

        {/* Margen bruto */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Margen Bruto Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{margenBruto.porcentajeMesActual.toFixed(1)}%</p>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-amber-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(margenBruto.porcentajeMesActual, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Monto: {formatCurrency(margenBruto.montoMesActual)}</span>
              <span>Mes ant: {margenBruto.porcentajeMesPasado.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Rotacion y Dias de Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rotacion de stock */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              Rotacion de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold">{rotacionStock.valor.toFixed(2)}</p>
              <RotacionIndicador valor={rotacionStock.valor} />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>CMV mensual</span>
                <span className="font-medium">{formatCurrency(rotacionStock.cmvMensual)}</span>
              </div>
              <div className="flex justify-between">
                <span>Stock promedio</span>
                <span className="font-medium">{formatCurrency(rotacionStock.stockPromedio)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium">Referencia:</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>0.3 - 0.8: Optimo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>0.8 - 1.0: Stock lento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>{'>'} 1.5: Posible quiebre de stock</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dias de stock */}
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Dias de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold">{diasStock.valor.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">dias</span></p>
              <DiasStockIndicador valor={diasStock.valor} />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Stock promedio</span>
                <span className="font-medium">{formatCurrency(diasStock.stockPromedio)}</span>
              </div>
              <div className="flex justify-between">
                <span>CMV mensual</span>
                <span className="font-medium">{formatCurrency(diasStock.cmvMensual)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium">Referencia:</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{'<'} 45 dias: Stock bajo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>45 - 90 dias: Nivel adecuado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>{'>'} 120 dias: Sobre stock</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top modelos del mes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Ranking por Marca y Modelo - Mes Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topModelos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas este mes</p>
            ) : (
              <div className="space-y-3">
                {topModelos.map((m: any, i: number) => (
                  <div key={`${m.marca}-${m.modelo}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-sm font-medium">{m.marca} {m.modelo}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{m.unidadesVendidas} pares</span>
                        <span className="font-medium">{formatCurrency(m.totalVendido)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(m.unidadesVendidas / maxUnidadesMes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top modelos historico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Ranking por Marca y Modelo - Historico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topModelosHistorico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas registradas</p>
            ) : (
              <div className="space-y-3">
                {topModelosHistorico.map((m: any, i: number) => (
                  <div key={`${m.marca}-${m.modelo}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-sm font-medium">{m.marca} {m.modelo}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{m.unidadesVendidas} pares</span>
                        <span className="font-medium">{formatCurrency(m.totalVendido)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${(m.unidadesVendidas / maxUnidadesHist) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
