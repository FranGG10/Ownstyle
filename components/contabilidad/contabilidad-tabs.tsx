"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LibroDiario } from "./libro-diario"
import { LibroMayor } from "./libro-mayor"
import { PlanCuentas } from "./plan-cuentas"
import { ReportesFinancieros } from "./reportes-financieros"
import { BookOpen, Calculator, FileSpreadsheet, PieChart } from "lucide-react"

interface ContabilidadTabsProps {
  data: {
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

export function ContabilidadTabs({ data }: ContabilidadTabsProps) {
  return (
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
        <LibroDiario asientos={data.asientos} />
      </TabsContent>

      <TabsContent value="mayor">
        <LibroMayor mayor={data.mayor} />
      </TabsContent>

      <TabsContent value="plan">
        <PlanCuentas cuentas={data.planCuentas} />
      </TabsContent>

      <TabsContent value="reportes">
        <ReportesFinancieros summary={data.summary} mayor={data.mayor} />
      </TabsContent>
    </Tabs>
  )
}
