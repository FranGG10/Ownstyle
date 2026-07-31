"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, TrendingUp, TrendingDown, DollarSign, Package, Search, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-AR")
}

export default function InformesClient() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const [fechaDesde, setFechaDesde] = useState(firstDayOfMonth.toISOString().split("T")[0])
  const [fechaHasta, setFechaHasta] = useState(today.toISOString().split("T")[0])
  
  const [fechaDesdeFlow, setFechaDesdeFlow] = useState(firstDayOfMonth.toISOString().split("T")[0])
  const [fechaHastaFlow, setFechaHastaFlow] = useState(today.toISOString().split("T")[0])

  const [fechaDesdeFact, setFechaDesdeFact] = useState(firstDayOfMonth.toISOString().split("T")[0])
  const [fechaHastaFact, setFechaHastaFact] = useState(today.toISOString().split("T")[0])

  const { data: proveedoresData, isLoading: loadingProveedores } = useSWR(
    `/api/informes/proveedores?desde=${fechaDesde}&hasta=${fechaHasta}`,
    fetcher
  )

  const { data: flujoData, isLoading: loadingFlujo } = useSWR(
    `/api/informes/flujo-efectivo?desde=${fechaDesdeFlow}&hasta=${fechaHastaFlow}`,
    fetcher
  )

  const { data: facturacionData, isLoading: loadingFacturacion } = useSWR(
    `/api/informes/facturacion?desde=${fechaDesdeFact}&hasta=${fechaHastaFact}`,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
          <p className="text-muted-foreground">Reportes detallados del negocio</p>
        </div>
      </div>

      <Tabs defaultValue="proveedores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proveedores" className="gap-2">
            <Package className="h-4 w-4" />
            Compras por Proveedor
          </TabsTrigger>
          <TabsTrigger value="flujo" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Flujo de Efectivo
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="gap-2">
            <Receipt className="h-4 w-4" />
            Facturación
          </TabsTrigger>
        </TabsList>

        {/* Reporte por Proveedor */}
        <TabsContent value="proveedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compras por Proveedor</CardTitle>
              <CardDescription>Detalle de compras realizadas a cada proveedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              {loadingProveedores ? (
                <div className="py-8 text-center text-muted-foreground">Cargando...</div>
              ) : proveedoresData?.proveedores?.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-center">Compras</TableHead>
                          <TableHead className="text-center">Pares</TableHead>
                          <TableHead className="text-right">Total Pagado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proveedoresData.proveedores.map((prov: any) => (
                          <TableRow key={prov.id_proveedor}>
                            <TableCell className="font-medium">{prov.razon_social}</TableCell>
                            <TableCell className="text-center">{prov.cantidad_compras}</TableCell>
                            <TableCell className="text-center">{prov.total_pares}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(Number(prov.total_pagado))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-blue-600 dark:text-blue-400">Total Compras</div>
                        <div className="text-2xl font-bold">{proveedoresData.totales.total_compras}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-green-600 dark:text-green-400">Total Pares</div>
                        <div className="text-2xl font-bold">{proveedoresData.totales.total_pares}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-orange-600 dark:text-orange-400">Total Pagado</div>
                        <div className="text-2xl font-bold">{formatCurrency(Number(proveedoresData.totales.total_pagado))}</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay compras registradas en el periodo seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flujo de Efectivo */}
        <TabsContent value="flujo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Efectivo</CardTitle>
              <CardDescription>Resumen de ingresos y egresos del periodo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={fechaDesdeFlow}
                    onChange={(e) => setFechaDesdeFlow(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={fechaHastaFlow}
                    onChange={(e) => setFechaHastaFlow(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              {loadingFlujo ? (
                <div className="py-8 text-center text-muted-foreground">Cargando...</div>
              ) : flujoData ? (
                <div className="space-y-6">
                  {/* Resumen principal */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <ArrowUpRight className="h-4 w-4" />
                          Total Ingresos
                        </div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(Number(flujoData.resumen.total_ingresos))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <ArrowDownRight className="h-4 w-4" />
                          Total Egresos
                        </div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {formatCurrency(Number(flujoData.resumen.total_egresos))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className={`${Number(flujoData.resumen.flujo_neto) >= 0 ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'}`}>
                      <CardContent className="pt-4">
                        <div className={`flex items-center gap-2 text-sm ${Number(flujoData.resumen.flujo_neto) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          <DollarSign className="h-4 w-4" />
                          Flujo Neto
                        </div>
                        <div className={`text-2xl font-bold ${Number(flujoData.resumen.flujo_neto) >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                          {formatCurrency(Number(flujoData.resumen.flujo_neto))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detalle de Ingresos */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Detalle de Ingresos
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {flujoData.ingresos.map((ing: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{ing.concepto}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(Number(ing.monto))}</TableCell>
                            </TableRow>
                          ))}
                          {flujoData.ingresos.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground">Sin ingresos en el periodo</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Detalle de Egresos */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-600 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Detalle de Egresos
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {flujoData.egresos.map((eg: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{eg.concepto}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">({formatCurrency(Number(eg.monto))})</TableCell>
                            </TableRow>
                          ))}
                          {flujoData.egresos.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground">Sin egresos en el periodo</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facturación */}
        <TabsContent value="facturacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas Facturadas</CardTitle>
              <CardDescription>Listado de ventas con Factura electrónica emitida (CAE)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={fechaDesdeFact}
                    onChange={(e) => setFechaDesdeFact(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={fechaHastaFact}
                    onChange={(e) => setFechaHastaFact(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              {loadingFacturacion ? (
                <div className="py-8 text-center text-muted-foreground">Cargando...</div>
              ) : facturacionData?.facturas?.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Comprobante</TableHead>
                          <TableHead>CAE</TableHead>
                          <TableHead>Vto. CAE</TableHead>
                          <TableHead className="text-right">Neto</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Venta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturacionData.facturas.map((f: any) => (
                          <TableRow key={f.id_factura}>
                            <TableCell>{formatDate(f.fecha)}</TableCell>
                            <TableCell className="font-medium">{f.cliente_nombre}</TableCell>
                            <TableCell>
                              {f.tipo_comprobante_nombre} Nº {String(f.punto_venta).padStart(4, "0")}-
                              {String(f.numero_comprobante).padStart(8, "0")}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{f.cae}</TableCell>
                            <TableCell>{formatDate(f.cae_vencimiento)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(f.imp_neto))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(f.imp_iva))}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(Number(f.importe_total))}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/ventas/detalle/${f.id_movimiento}`}
                                className="text-primary hover:underline text-sm"
                              >
                                Ver venta
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-blue-600 dark:text-blue-400">Facturas Emitidas</div>
                        <div className="text-2xl font-bold">{facturacionData.totales.cantidad}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-green-600 dark:text-green-400">Total Neto</div>
                        <div className="text-2xl font-bold">{formatCurrency(Number(facturacionData.totales.total_neto))}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-orange-600 dark:text-orange-400">Total IVA</div>
                        <div className="text-2xl font-bold">{formatCurrency(Number(facturacionData.totales.total_iva))}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                      <CardContent className="pt-4">
                        <div className="text-sm text-purple-600 dark:text-purple-400">Total Facturado</div>
                        <div className="text-2xl font-bold">{formatCurrency(Number(facturacionData.totales.total_general))}</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay ventas facturadas en el periodo seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
