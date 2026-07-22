"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import Link from "next/link"

interface CompraDetailProps {
  compra: {
    id_movimiento: number
    numero_comprobante: string
    fecha: string
    proveedor_nombre: string
    proveedor_cuit: string
    subtotal: number
    iva: number
    total: number
    medio_pago: string
    estado: string
    observaciones: string
    created_at: string
    detalles: {
      id_detalle: number
      codigo_sku: string
      descripcion: string
      marca: string
      talle: string
      color: string
      cantidad: number
      costo_unitario: number
      subtotal: number
    }[]
    asiento: {
      id_asiento: number
      numero: number
      fecha: string
      codigo: string
      cuenta_nombre: string
      detalle_desc: string
      debe: number
      haber: number
    }[]
  }
}

export function CompraDetail({ compra }: CompraDetailProps) {
  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completado: { label: "Completado", className: "bg-success/10 text-success border-success/20" },
      pendiente: { label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20" },
      anulado: { label: "Anulado", className: "bg-destructive/10 text-destructive border-destructive/20" },
    }
    return variants[estado] || { label: estado, className: "" }
  }

  const getMedioPagoBadge = (medio: string) => {
    if (medio === "efectivo") {
      return { label: "Efectivo", icon: "💵" }
    }
    return { label: "Transferencia", icon: "🏦" }
  }

  const statusBadge = getStatusBadge(compra.estado)
  const medioPagoBadge = getMedioPagoBadge(compra.medio_pago || "efectivo")
  const asientoHeader = compra.asiento[0]

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/compras">
          <Button variant="outline">← Volver</Button>
        </Link>
        <div className="flex gap-2">
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
          <Badge variant="outline">
            {medioPagoBadge.icon} {medioPagoBadge.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compra Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📄 Información de la Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">N° Comprobante</p>
                <p className="font-mono font-medium text-lg">{compra.numero_comprobante}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(compra.fecha)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium">{compra.proveedor_nombre || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medio de Pago</p>
                <p className="font-medium">
                  {medioPagoBadge.icon} {medioPagoBadge.label}
                </p>
              </div>
            </div>

            {compra.observaciones && (
              <div>
                <p className="text-sm text-muted-foreground">Detalle / Observaciones</p>
                <p className="font-medium">{compra.observaciones}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Creado</p>
              <p className="text-sm">{formatDateTime(compra.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Totals - sin IVA */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unidades compradas</span>
                <span className="tabular-nums font-medium">
                  {compra.detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(Number(compra.total))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-center">Talle</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compra.detalles.map((detalle) => (
                  <TableRow key={detalle.id_detalle}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {detalle.marca} {detalle.descripcion?.split(" ")[1] || ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{detalle.codigo_sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{detalle.color}</TableCell>
                    <TableCell className="text-center font-medium">{detalle.talle}</TableCell>
                    <TableCell className="text-center tabular-nums">{detalle.cantidad}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(detalle.costo_unitario))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCurrency(Number(detalle.subtotal))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {compra.detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(Number(compra.total))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Accounting Entry */}
      {asientoHeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📒 Asiento Contable N° {asientoHeader.numero}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compra.asiento
                    .filter((a) => a.codigo)
                    .map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{detalle.codigo}</TableCell>
                        <TableCell className="font-medium">{detalle.cuenta_nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{detalle.detalle_desc}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(detalle.debe) > 0 ? formatCurrency(Number(detalle.debe)) : "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(detalle.haber) > 0 ? formatCurrency(Number(detalle.haber)) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      Totales
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(compra.asiento.reduce((sum, a) => sum + Number(a.debe || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(compra.asiento.reduce((sum, a) => sum + Number(a.haber || 0), 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
