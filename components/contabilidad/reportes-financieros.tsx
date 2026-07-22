"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { PieChart, TrendingUp, TrendingDown, Wallet, Building } from "lucide-react"

interface MayorEntry {
  id_cuenta: number
  codigo: string
  nombre: string
  tipo: string
  total_debe: number
  total_haber: number
  saldo: number
}

interface ReportesFinancierosProps {
  summary: {
    activo: number
    pasivo: number
    patrimonio: number
    ingresos: number
    gastos: number
  }
  mayor: MayorEntry[]
}

export function ReportesFinancieros({ summary, mayor }: ReportesFinancierosProps) {
  const resultado = summary.ingresos - summary.gastos
  const patrimonioTotal = summary.patrimonio + resultado

  const activoCuentas = mayor.filter((m) => m.tipo === "activo" && Math.abs(Number(m.saldo)) > 0.01)
  const pasivoCuentas = mayor.filter((m) => m.tipo === "pasivo" && Math.abs(Number(m.saldo)) > 0.01)
  const patrimonioCuentas = mayor.filter((m) => m.tipo === "patrimonio" && Math.abs(Number(m.saldo)) > 0.01)
  const ingresoCuentas = mayor.filter((m) => m.tipo === "ingreso" && Math.abs(Number(m.saldo)) > 0.01)
  const gastoCuentas = mayor.filter((m) => m.tipo === "gasto" && Math.abs(Number(m.saldo)) > 0.01)
  
  // Separar retiros del titular de otras cuentas de patrimonio
  // Los retiros tienen saldo deudor (negativo para patrimonio), por eso el summary.patrimonio ya los tiene restados
  const retirosCuenta = patrimonioCuentas.find((c) => c.nombre === "Retiros del Titular")
  const otrasPatrimonioCuentas = patrimonioCuentas.filter((c) => c.nombre !== "Retiros del Titular")
  // El saldo de retiros es negativo (cuenta deudora), tomamos el valor absoluto para mostrarlo
  const totalRetiros = retirosCuenta ? Math.abs(Number(retirosCuenta.saldo)) : 0
  // Capital sin retiros = patrimonio del summary + retiros (porque el summary ya los resto)
  const capitalSinRetiros = summary.patrimonio + totalRetiros

  // Estado de Resultados reestructurado
  const ventasCuenta = ingresoCuentas.find((c) => c.nombre === "Ventas")
  const otrosIngresosCuentas = ingresoCuentas.filter((c) => c.nombre !== "Ventas")
  const cmvCuenta = gastoCuentas.find((c) => c.nombre === "Costo de Mercadería Vendida")
  const otrosGastosCuentas = gastoCuentas.filter((c) => c.nombre !== "Costo de Mercadería Vendida")

  const totalVentas = ventasCuenta ? Math.abs(Number(ventasCuenta.saldo)) : 0
  const totalCMV = cmvCuenta ? Math.abs(Number(cmvCuenta.saldo)) : 0
  const margenBruto = totalVentas - totalCMV
  const totalOtrosIngresos = otrosIngresosCuentas.reduce((sum, c) => sum + Math.abs(Number(c.saldo)), 0)
  const totalOtrosGastos = otrosGastosCuentas.reduce((sum, c) => sum + Math.abs(Number(c.saldo)), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activo Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary.activo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-500/10 p-2">
                <Wallet className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pasivo Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary.pasivo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-xl font-bold">{formatCurrency(summary.ingresos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-xl font-bold">{formatCurrency(summary.gastos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Estado de Resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Estado de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ventas */}
              <div className="flex justify-between font-semibold">
                <span className="text-green-600">Ventas</span>
                <span className="tabular-nums text-green-600">{formatCurrency(totalVentas)}</span>
              </div>

              {/* Costo de Mercaderia Vendida */}
              <div className="flex justify-between font-semibold">
                <span className="text-red-600">Costo de Mercaderia Vendida</span>
                <span className="tabular-nums text-red-600">({formatCurrency(totalCMV)})</span>
              </div>

              {/* Margen Bruto */}
              <div className="flex justify-between font-bold text-lg border-t-2 border-b-2 py-3">
                <span>Margen Bruto</span>
                <span className={margenBruto >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(margenBruto)}</span>
              </div>

              {/* Otros Ingresos */}
              {otrosIngresosCuentas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">Otros Ingresos</h4>
                  {otrosIngresosCuentas.map((cuenta) => (
                    <div key={cuenta.id_cuenta} className="flex justify-between text-sm pl-4">
                      <span>{cuenta.nombre}</span>
                      <span className="tabular-nums">{formatCurrency(Math.abs(Number(cuenta.saldo)))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Otros Ingresos</span>
                    <span className="tabular-nums text-green-600">{formatCurrency(totalOtrosIngresos)}</span>
                  </div>
                </div>
              )}

              {/* Gastos Operativos */}
              {otrosGastosCuentas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-600">Gastos</h4>
                  {otrosGastosCuentas.map((cuenta) => (
                    <div key={cuenta.id_cuenta} className="flex justify-between text-sm pl-4">
                      <span>{cuenta.nombre}</span>
                      <span className="tabular-nums">{formatCurrency(Math.abs(Number(cuenta.saldo)))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Gastos</span>
                    <span className="tabular-nums text-orange-600">({formatCurrency(totalOtrosGastos)})</span>
                  </div>
                </div>
              )}

              {/* Resultado del Ejercicio */}
              <div className="flex justify-between font-bold text-lg border-t-2 pt-4">
                <span>Resultado del Ejercicio</span>
                <span className={resultado >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(resultado)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Balance General (Simplificado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Activos */}
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">Activo</h4>
                {activoCuentas.length > 0 ? (
                  activoCuentas.map((cuenta) => {
                    const saldo = Number(cuenta.saldo)
                    const esNegativo = saldo < 0
                    return (
                      <div key={cuenta.id_cuenta} className="flex justify-between text-sm pl-4">
                        <span>{cuenta.nombre}</span>
                        <span className={`tabular-nums ${esNegativo ? "text-red-600" : ""}`}>
                          {esNegativo ? `(${formatCurrency(Math.abs(saldo))})` : formatCurrency(saldo)}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground pl-4">Sin activos registrados</p>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Activo</span>
                  <span className="tabular-nums text-blue-600">{formatCurrency(summary.activo)}</span>
                </div>
              </div>

              {/* Pasivos */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Pasivo</h4>
                {pasivoCuentas.length > 0 ? (
                  pasivoCuentas.map((cuenta) => (
                    <div key={cuenta.id_cuenta} className="flex justify-between text-sm pl-4">
                      <span>{cuenta.nombre}</span>
                      <span className="tabular-nums">{formatCurrency(Math.abs(Number(cuenta.saldo)))}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground pl-4">Sin pasivos registrados</p>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Pasivo</span>
                  <span className="tabular-nums text-red-600">{formatCurrency(summary.pasivo)}</span>
                </div>
              </div>

              {/* Patrimonio */}
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-600">Patrimonio Neto</h4>
                {otrasPatrimonioCuentas.length > 0 ? (
                  otrasPatrimonioCuentas.map((cuenta) => (
                    <div key={cuenta.id_cuenta} className="flex justify-between text-sm pl-4">
                      <span>{cuenta.nombre}</span>
                      <span className="tabular-nums">{formatCurrency(Math.abs(Number(cuenta.saldo)))}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-sm pl-4">
                    <span>Capital y Reservas</span>
                    <span className="tabular-nums">{formatCurrency(capitalSinRetiros)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pl-4">
                  <span>Resultado del Ejercicio</span>
                  <span className={`tabular-nums ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {resultado >= 0 ? formatCurrency(resultado) : `(${formatCurrency(Math.abs(resultado))})`}
                  </span>
                </div>
                {totalRetiros > 0 && (
                  <div className="flex justify-between text-sm pl-4">
                    <span>Retiros del Titular</span>
                    <span className="tabular-nums text-red-600">({formatCurrency(totalRetiros)})</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Patrimonio Neto</span>
                  <span className="tabular-nums text-purple-600">{formatCurrency(patrimonioTotal)}</span>
                </div>
              </div>

              {/* Total Pasivo + PN */}
              <div className="flex justify-between font-bold text-lg border-t-2 pt-4">
                <span>Total Pasivo + P.N.</span>
                <span>{formatCurrency(summary.pasivo + patrimonioTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
