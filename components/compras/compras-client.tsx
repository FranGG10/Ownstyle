"use client"

import { useState, useEffect } from "react"
import { ComprasTable } from "./compras-table"
import { ComprasStats } from "./compras-stats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Calendar, Filter, X, Upload } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ComprasClient() {
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [filtroActivo, setFiltroActivo] = useState(false)

  // Construir URL con parámetros
  const buildUrl = () => {
    const params = new URLSearchParams()
    if (fechaDesde) params.append("fechaDesde", fechaDesde)
    if (fechaHasta) params.append("fechaHasta", fechaHasta)
    const queryString = params.toString()
    return `/api/compras${queryString ? `?${queryString}` : ""}`
  }

  const { data, error, isLoading, mutate } = useSWR(buildUrl(), fetcher, {
    revalidateOnFocus: false,
  })

  const aplicarFiltro = () => {
    setFiltroActivo(fechaDesde !== "" || fechaHasta !== "")
    mutate()
  }

  const limpiarFiltros = () => {
    setFechaDesde("")
    setFechaHasta("")
    setFiltroActivo(false)
  }

  const setFiltroRapido = (tipo: "hoy" | "semana" | "mes" | "año") => {
    const hoy = new Date()
    const desde = new Date()

    switch (tipo) {
      case "hoy":
        desde.setHours(0, 0, 0, 0)
        break
      case "semana":
        desde.setDate(hoy.getDate() - 7)
        break
      case "mes":
        desde.setMonth(hoy.getMonth(), 1)
        break
      case "año":
        desde.setMonth(0, 1)
        break
    }

    setFechaDesde(desde.toISOString().split("T")[0])
    setFechaHasta(hoy.toISOString().split("T")[0])
    setFiltroActivo(true)
  }

  useEffect(() => {
    if (filtroActivo || (!fechaDesde && !fechaHasta)) {
      mutate()
    }
  }, [fechaDesde, fechaHasta, filtroActivo, mutate])

  const compras = data?.compras || []
  const stats = data?.stats || { total: 0, completadas: 0, totalCompras: 0, comprasMes: 0 }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestión de Compras</h2>
          <p className="text-sm text-muted-foreground">
            Registra compras con generación automática de asientos contables
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/compras/carga-masiva">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Carga Masiva
            </Button>
          </Link>
          <Link href="/compras/crear">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Compra
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por fecha:</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFiltroRapido("hoy")}>
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFiltroRapido("semana")}>
                Última Semana
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFiltroRapido("mes")}>
                Este Mes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFiltroRapido("año")}>
                Este Año
              </Button>
            </div>

            {filtroActivo && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {filtroActivo && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-3 py-2 rounded-md">
              <Filter className="h-4 w-4" />
              <span>
                Mostrando compras
                {fechaDesde && ` desde ${new Date(fechaDesde).toLocaleDateString("es-AR")}`}
                {fechaHasta && ` hasta ${new Date(fechaHasta).toLocaleDateString("es-AR")}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ComprasStats stats={stats} />

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Cargando compras...</CardContent>
        </Card>
      ) : (
        <ComprasTable compras={compras} />
      )}
    </div>
  )
}
