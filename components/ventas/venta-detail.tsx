"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { ArrowLeft, FileText, BookOpen } from "lucide-react"
import Link from "next/link"

interface VentaDetailProps {
  venta: {
    id_movimiento: number
    numero_comprobante: string
    fecha: string
    cliente_nombre: string
    cliente_cuit: string
    subtotal: number
    iva: number
    total: number
    estado: string
    observaciones: string
    created_at: string
    detalles: {
      id_detalle: number
      codigo_sku: string
      descripcion: string
      marca: string
      cantidad: number
      precio_unitario: number
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

export function VentaDetail({ venta }: VentaDetailProps) {
  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completado: { label: "Completado", className: "bg-success/10 text-success border-success/20" },
      pendiente: { label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20" },
      anulado: { label: "Anulado", className: "bg-destructive/10 text-destructive border-destructive/20" },
    }
    return variants[estado] || { label: estado, className: "" }
  }

  const statusBadge = getStatusBadge(venta.estado)

  // Group asiento details
  const asientoHeader = venta.asiento[0]

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/ventas">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Badge variant="outline" className={statusBadge.className}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Venta Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">N° Comprobante</p>
                <p className="font-mono font-medium text-lg">{venta.numero_comprobante}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(venta.fecha)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{venta.cliente_nombre || "Consumidor Final"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CUIT</p>
                <p className="font-medium">{venta.cliente_cuit || "-"}</p>
              </div>
            </div>

            {venta.observaciones && (
              <div>
                <p className="text-sm text-muted-foreground">Observaciones</p>
                <p className="font-medium">{venta.observaciones}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Creado</p>
              <p className="text-sm">{formatDateTime(venta.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(Number(venta.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (21%)</span>
                <span className="tabular-nums">{formatCurrency(Number(venta.iva))}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(Number(venta.total))}
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.detalles.map((detalle) => (
                  <TableRow key={detalle.id_detalle}>
                    <TableCell className="font-mono text-sm">{detalle.codigo_sku}</TableCell>
                    <TableCell className="font-medium">{detalle.descripcion}</TableCell>
                    <TableCell>{detalle.marca}</TableCell>
                    <TableCell className="text-center tabular-nums">{detalle.cantidad}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(detalle.precio_unitario))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCurrency(Number(detalle.subtotal))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Accounting Entry */}
      {asientoHeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Asiento Contable N° {asientoHeader.numero}
            </CardTitle>
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
                  {venta.asiento
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
                      {formatCurrency(venta.asiento.reduce((sum, a) => sum + Number(a.debe || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(venta.asiento.reduce((sum, a) => sum + Number(a.haber || 0), 0))}
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
