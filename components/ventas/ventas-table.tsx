"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Search, Trash2, Loader2, Banknote, CreditCard, Building2, CheckCircle, Receipt } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import Link from "next/link"
import type { Movimiento } from "@/lib/db"
import { deleteVenta } from "@/app/actions/ventas"
import { facturarVentasLote } from "@/app/actions/facturacion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface VentasTableProps {
  ventas: (Movimiento & {
    cliente_nombre?: string
    nombre_cliente?: string
    barrio?: string
    medio_pago?: string
    factura_punto_venta?: number | null
    factura_numero?: number | null
    factura_cae?: string | null
    factura_tipo_comprobante?: number | null
  })[]
  onFacturado?: () => void
}

const NOMBRE_COMPROBANTE: Record<number, string> = {
  1: "Factura A",
  6: "Factura B",
  11: "Factura C",
}

export function VentasTable({ ventas, onFacturado }: VentasTableProps) {
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [deletedComprobante, setDeletedComprobante] = useState("")
  const [seleccionadas, setSeleccionadas] = useState<number[]>([])
  const [facturando, setFacturando] = useState(false)

  const filteredVentas = ventas.filter((venta) => {
    const nombre = venta.nombre_cliente || venta.cliente_nombre || ""
    const matchesSearch =
      venta.numero_comprobante?.toLowerCase().includes(search.toLowerCase()) ||
      nombre.toLowerCase().includes(search.toLowerCase()) ||
      venta.barrio?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completado: {
        label: "Completado",
        className:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
      },
      confirmado: {
        label: "Confirmado",
        className:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
      },
      pendiente: {
        label: "Pendiente",
        className:
          "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
      },
      anulado: {
        label: "Anulado",
        className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
      },
    }
    return variants[estado] || { label: estado, className: "bg-gray-100 text-gray-700 border-gray-300" }
  }

  const getMedioPagoIcon = (medioPago: string | undefined) => {
    switch (medioPago?.toLowerCase()) {
      case "efectivo":
        return <Banknote className="h-4 w-4 text-emerald-600" />
      case "transferencia":
        return <Building2 className="h-4 w-4 text-blue-600" />
      case "tarjeta":
        return <CreditCard className="h-4 w-4 text-purple-600" />
      default:
        return <Banknote className="h-4 w-4 text-gray-500" />
    }
  }

  const esFacturable = (venta: (typeof ventas)[number]) => venta.estado === "completado" && !venta.factura_numero

  const facturables = filteredVentas.filter(esFacturable)
  const todasSeleccionadas = facturables.length > 0 && facturables.every((v) => seleccionadas.includes(v.id_movimiento))

  const toggleSeleccionada = (idMovimiento: number) => {
    setSeleccionadas((prev) =>
      prev.includes(idMovimiento) ? prev.filter((id) => id !== idMovimiento) : [...prev, idMovimiento],
    )
  }

  const toggleSeleccionarTodas = () => {
    if (todasSeleccionadas) {
      setSeleccionadas([])
    } else {
      setSeleccionadas(facturables.map((v) => v.id_movimiento))
    }
  }

  const handleFacturarSeleccionadas = async () => {
    if (seleccionadas.length === 0) return
    setFacturando(true)
    try {
      const resultados = await facturarVentasLote(seleccionadas)
      const entries = Object.entries(resultados)
      const exitosas = entries.filter(([, r]) => r.success)
      const fallidas = entries.filter(([, r]) => !r.success)

      let mensaje = `Facturación terminada.\n\n${exitosas.length} venta(s) facturada(s) con éxito.`
      if (fallidas.length > 0) {
        mensaje += `\n${fallidas.length} venta(s) con error:\n`
        mensaje += fallidas.map(([id, r]) => `- Venta #${id}: ${r.error}`).join("\n")
      }
      alert(mensaje)

      setSeleccionadas([])
      onFacturado?.()
    } catch (error) {
      alert("Error inesperado al facturar las ventas seleccionadas")
    } finally {
      setFacturando(false)
    }
  }

  const handleDelete = async (idMovimiento: number, comprobante: string) => {
    setDeleting(idMovimiento)
    try {
      const result = await deleteVenta(idMovimiento)
      if (result.success) {
        setDeletedComprobante(comprobante)
        setShowSuccess(true)
        // Redirigir después de mostrar el mensaje
        setTimeout(() => {
          window.location.href = "/ventas"
        }, 2000)
      } else {
        alert(result.error || "Error al eliminar la venta")
      }
    } catch (error) {
      alert("Error al eliminar la venta")
    } finally {
      setDeleting(null)
    }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">¡Venta Eliminada!</h2>
          <p className="text-muted-foreground mb-4">
            La venta <span className="font-semibold">{deletedComprobante}</span> ha sido eliminada correctamente. El
            stock ha sido restaurado y el asiento contable eliminado.
          </p>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por comprobante, nombre o barrio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {seleccionadas.length > 0 && (
            <Button onClick={handleFacturarSeleccionadas} disabled={facturando}>
              {facturando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Facturar seleccionadas ({seleccionadas.length})
            </Button>
          )}
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={todasSeleccionadas}
                    onCheckedChange={toggleSeleccionarTodas}
                    disabled={facturables.length === 0}
                    aria-label="Seleccionar todas las ventas facturables"
                  />
                </TableHead>
                <TableHead className="font-semibold">N° Comprobante</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                <TableHead className="font-semibold">Barrio</TableHead>
                <TableHead className="font-semibold">Medio de Pago</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
                <TableHead className="text-center font-semibold">Estado</TableHead>
                <TableHead className="text-center font-semibold">Factura</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVentas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron ventas
                  </TableCell>
                </TableRow>
              ) : (
                filteredVentas.map((venta, index) => {
                  const statusBadge = getStatusBadge(venta.estado)
                  const nombreMostrar = venta.nombre_cliente || venta.cliente_nombre || "Consumidor Final"
                  const comprobante = venta.numero_comprobante || `V-${venta.id_movimiento}`
                  return (
                    <TableRow key={venta.id_movimiento} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <TableCell>
                        <Checkbox
                          checked={seleccionadas.includes(venta.id_movimiento)}
                          onCheckedChange={() => toggleSeleccionada(venta.id_movimiento)}
                          disabled={!esFacturable(venta)}
                          aria-label={`Seleccionar venta ${comprobante} para facturar`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{comprobante}</TableCell>
                      <TableCell>{formatDate(venta.fecha)}</TableCell>
                      <TableCell className="font-medium">{nombreMostrar}</TableCell>
                      <TableCell>
                        {venta.barrio ? (
                          <span className="text-muted-foreground">{venta.barrio}</span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMedioPagoIcon(venta.medio_pago)}
                          <span className="capitalize">{venta.medio_pago || "Efectivo"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                        {formatCurrency(Number(venta.total))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {venta.factura_numero ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                            title={`CAE ${venta.factura_cae}`}
                          >
                            {NOMBRE_COMPROBANTE[venta.factura_tipo_comprobante || 11] || "Factura"} Nº{" "}
                            {String(venta.factura_punto_venta).padStart(4, "0")}-
                            {String(venta.factura_numero).padStart(8, "0")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sin facturar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/ventas/detalle/${venta.id_movimiento}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                disabled={deleting === venta.id_movimiento}
                              >
                                {deleting === venta.id_movimiento ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar venta {comprobante}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará la venta, restaurará el stock de los productos y eliminará el
                                  asiento contable asociado. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(venta.id_movimiento, comprobante)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredVentas.length} de {ventas.length} ventas
        </div>
      </CardContent>
    </Card>
  )
}
