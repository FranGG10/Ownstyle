export const dynamic = "force-dynamic"

import { neon } from "@neondatabase/serverless"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"
import Link from "next/link"
import { IngresosEgresosTable } from "@/components/ingresos-egresos/ingresos-egresos-table"
import { formatCurrency } from "@/lib/format"
import { Header } from "@/components/header"

const sql = neon(process.env.DATABASE_URL!)

async function getIngresosEgresosData() {
  const [movimientos, totales] = await Promise.all([
    sql`
      SELECT 
        ie.*,
        pc.nombre as cuenta_nombre,
        pc.codigo as cuenta_codigo
      FROM ingresos_egresos ie
      LEFT JOIN plan_cuentas pc ON ie.id_cuenta = pc.id_cuenta
      ORDER BY ie.fecha DESC, ie.created_at DESC
      LIMIT 100
    `,
    sql`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos
      FROM ingresos_egresos
    `,
  ])

  return {
    movimientos,
    totalIngresos: Number(totales[0]?.total_ingresos || 0),
    totalEgresos: Number(totales[0]?.total_egresos || 0),
  }
}

export default async function IngresosEgresosPage() {
  const { movimientos, totalIngresos, totalEgresos } = await getIngresosEgresosData()
  const balance = totalIngresos - totalEgresos

  return (
    <div className="flex flex-col">
      <Header title="Ingresos / Egresos" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestión de Ingresos y Egresos</h2>
            <p className="text-sm text-muted-foreground">Movimientos financieros no relacionados con zapatillas</p>
          </div>
          <Link href="/ingresos-egresos/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-emerald-500 overflow-hidden transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Ingresos</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIngresos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 overflow-hidden transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-gradient-to-br from-red-500/20 to-red-600/10">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Egresos</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalEgresos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-l-4 overflow-hidden transition-all duration-200 hover:shadow-lg ${balance >= 0 ? "border-l-blue-500" : "border-l-amber-500"}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-xl p-3 ${balance >= 0 ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10" : "bg-gradient-to-br from-amber-500/20 to-amber-600/10"}`}
                >
                  <Wallet className={`h-6 w-6 ${balance >= 0 ? "text-blue-600" : "text-amber-600"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-l-4 border-l-purple-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50/50 to-transparent pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <IngresosEgresosTable movimientos={movimientos} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
