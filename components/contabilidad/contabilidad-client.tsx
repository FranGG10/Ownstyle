"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LibroDiario } from "./libro-diario"
import { LibroMayor } from "./libro-mayor"
import { PlanCuentas } from "./plan-cuentas"
import { ReportesFinancieros } from "./reportes-financieros"
import { BookOpen, Calculator, FileSpreadsheet, PieChart, Calendar, Filter, X } from "lucide-react"
import useSWR from "swr"

interface ContabilidadClientProps {
  initialData: {
    asientos: any[]
    planCuentas: any[]
    mayor: any[]
    summary: {
      activo: number
      pasivo: number
      patrimonio: number
      ingresos: number
      gastos: number
    }
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ContabilidadClient({ initialData }: ContabilidadClientProps) {
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [filtroActivo, setFiltroActivo] = useState(false)

  // Construir URL con parámetros de fecha
  const apiUrl =
    filtroActivo && fechaDesde && fechaHasta ? `/api/contabilidad?desde=${fechaDesde}&hasta=${fechaHasta}` : null

  const { data, isLoading } = useSWR(apiUrl, fetcher)

  // Usar datos filtrados si hay filtro activo, sino usar datos iniciales
  const currentData = filtroActivo && data ? data : initialData

  const aplicarFiltro = () => {
    if (fechaDesde && fechaHasta) {
      setFiltroActivo(true)
    }
  }

  const limpiarFiltro = () => {
    setFechaDesde("")
    setFechaHasta("")
    setFiltroActivo(false)
  }

  // Presets de períodos comunes
  const setPeriodo = (periodo: string) => {
    const hoy = new Date()
    let desde: Date
    let hasta: Date = hoy

    switch (periodo) {
      case "mes":
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        break
      case "trimestre":
        const trimestre = Math.floor(hoy.getMonth() / 3)
        desde = new Date(hoy.getFullYear(), trimestre * 3, 1)
        hasta = new Date(hoy.getFullYear(), (trimestre + 1) * 3, 0)
        break
      case "año":
        desde = new Date(hoy.getFullYear(), 0, 1)
        hasta = new Date(hoy.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setFechaDesde(desde.toISOString().split("T")[0])
    setFechaHasta(hasta.toISOString().split("T")[0])
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Fechas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Filtrar por Período</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPeriodo("mes")}>
                Este Mes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPeriodo("trimestre")}>
                Este Trimestre
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPeriodo("año")}>
                Este Año
              </Button>
            </div>

            <div className="flex flex-1 flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desde" className="text-sm">
                  Desde
                </Label>
                <Input
                  id="desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hasta" className="text-sm">
                  Hasta
                </Label>
                <Input
                  id="hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={aplicarFiltro} disabled={!fechaDesde || !fechaHasta}>
                  <Filter className="mr-2 h-4 w-4" />
                  Aplicar
                </Button>
                {filtroActivo && (
                  <Button variant="outline" onClick={limpiarFiltro}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {filtroActivo && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <Calendar className="h-4 w-4" />
              <span>
                Mostrando datos del período: {new Date(fechaDesde).toLocaleDateString("es-AR")} al{" "}
                {new Date(fechaHasta).toLocaleDateString("es-AR")}
              </span>
              {isLoading && <span className="ml-2 text-muted-foreground">(Cargando...)</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Contabilidad */}
      <Tabs defaultValue="diario" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="diario" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Libro Diario</span>
          </TabsTrigger>
          <TabsTrigger value="mayor" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Libro Mayor</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Plan de Cuentas</span>
          </TabsTrigger>
          <TabsTrigger value="reportes" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Reportes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diario">
          <LibroDiario asientos={currentData.asientos} />
        </TabsContent>

        <TabsContent value="mayor">
          <LibroMayor mayor={currentData.mayor} />
        </TabsContent>

        <TabsContent value="plan">
          <PlanCuentas cuentas={currentData.planCuentas} />
        </TabsContent>

        <TabsContent value="reportes">
          <ReportesFinancieros summary={currentData.summary} mayor={currentData.mayor} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
