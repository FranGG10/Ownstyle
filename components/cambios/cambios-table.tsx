"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, CheckCircle, Filter, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/format"
import { completarCambio, eliminarCambio } from "@/app/actions/cambios"
import { useRouter } from "next/navigation"

interface DetalleProducto {
  ent_nombre: string
  ent_sku: string
  ent_talle: string | null
  ent_color: string | null
  rec_nombre: string
  rec_sku: string
  rec_talle: string | null
  rec_color: string | null
}

interface Cambio {
  id_cambio: number
  fecha: string
  nombre_cliente: string | null
  cliente_razon_social: string | null
  motivo: string
  estado: string
  observaciones: string | null
  cantidad_pares: number | null
  detalles: DetalleProducto[]
}

interface CambiosTableProps {
  cambios: Cambio[]
}

export function CambiosTable({ cambios }: CambiosTableProps) {
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "completado">("todos")
  const [loading, setLoading] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const router = useRouter()

  const filteredCambios = cambios.filter((cambio) => {
    if (filtroEstado !== "todos" && cambio.estado !== filtroEstado) return false

    const searchLower = search.toLowerCase()
    if (!searchLower) return true

    return (
      cambio.nombre_cliente?.toLowerCase().includes(searchLower) ||
      cambio.cliente_razon_social?.toLowerCase().includes(searchLower) ||
      cambio.motivo?.toLowerCase().includes(searchLower) ||
      cambio.detalles.some(
        (d) =>
          d.ent_nombre?.toLowerCase().includes(searchLower) ||
          d.rec_nombre?.toLowerCase().includes(searchLower) ||
          d.ent_sku?.toLowerCase().includes(searchLower) ||
          d.rec_sku?.toLowerCase().includes(searchLower),
      )
    )
  })

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completado: {
        label: "Completado",
        className:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
      },
      pendiente: {
        label: "Pendiente",
        className:
          "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
      },
    }
    return variants[estado] || { label: estado, className: "bg-gray-100 text-gray-700 border-gray-300" }
  }

  const handleCompletar = async (idCambio: number) => {
    if (loading) return

    const confirmado = window.confirm(
      "Confirmar que recibiste los productos devueltos? Esto aumentara el stock de los productos recibidos.",
    )

    if (!confirmado) return

    setLoading(idCambio)
    try {
      const result = await completarCambio(idCambio)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Error al completar el cambio")
      }
    } catch (error) {
      alert("Error al completar el cambio")
    } finally {
      setLoading(null)
    }
  }

  const handleEliminar = async (idCambio: number, estado: string) => {
    if (deleting) return

    const mensaje = estado === "completado"
      ? "Eliminar este cambio? Se revertira el stock de los productos entregados Y recibidos."
      : "Eliminar este cambio? Se restaurara el stock de los productos entregados."

    const confirmado = window.confirm(mensaje)
    if (!confirmado) return

    setDeleting(idCambio)
    try {
      const result = await eliminarCambio(idCambio)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Error al eliminar el cambio")
      }
    } catch (error) {
      alert("Error al eliminar el cambio")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, producto o motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filtroEstado === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroEstado("todos")}
            >
              Todos
            </Button>
            <Button
              variant={filtroEstado === "pendiente" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroEstado("pendiente")}
              className={filtroEstado === "pendiente" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
            >
              Pendientes
            </Button>
            <Button
              variant={filtroEstado === "completado" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroEstado("completado")}
              className={filtroEstado === "completado" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              Completados
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Productos Entregados</TableHead>
                <TableHead className="font-semibold">Productos a Recibir</TableHead>
                <TableHead className="font-semibold">Motivo</TableHead>
                <TableHead className="text-center font-semibold">Pares</TableHead>
                <TableHead className="text-center font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCambios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron cambios
                  </TableCell>
                </TableRow>
              ) : (
                filteredCambios.map((cambio, index) => {
                  const statusBadge = getStatusBadge(cambio.estado)
                  const clienteNombre = cambio.cliente_razon_social || cambio.nombre_cliente || "Sin nombre"
                  const detalles = cambio.detalles || []

                  return (
                    <TableRow key={cambio.id_cambio} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <TableCell className="font-mono font-medium text-violet-600 dark:text-violet-400">
                        #{cambio.id_cambio}
                      </TableCell>
                      <TableCell>{formatDate(cambio.fecha)}</TableCell>
                      <TableCell className="font-medium">{clienteNombre}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {detalles.length > 0 ? (
                            detalles.map((d, i) => (
                              <div
                                key={i}
                                className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2 border border-red-200 dark:border-red-800"
                              >
                                <div className="font-medium text-red-700 dark:text-red-400 text-sm">
                                  {d.ent_nombre}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {d.ent_sku}
                                  {d.ent_talle && ` | T: ${d.ent_talle}`}
                                  {d.ent_color && ` | ${d.ent_color}`}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-sm">Sin detalles</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {detalles.length > 0 ? (
                            detalles.map((d, i) => (
                              <div
                                key={i}
                                className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800"
                              >
                                <div className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">
                                  {d.rec_nombre}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {d.rec_sku}
                                  {d.rec_talle && ` | T: ${d.rec_talle}`}
                                  {d.rec_color && ` | ${d.rec_color}`}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-sm">Sin detalles</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{cambio.motivo}</TableCell>
                      <TableCell className="text-center font-medium">
                        {detalles.length > 0 ? detalles.length : (Number(cambio.cantidad_pares) > 0 ? cambio.cantidad_pares : 1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cambio.estado === "pendiente" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleCompletar(cambio.id_cambio)}
                              disabled={loading === cambio.id_cambio}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {loading === cambio.id_cambio ? "..." : "Completar"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEliminar(cambio.id_cambio, cambio.estado)}
                            disabled={deleting === cambio.id_cambio}
                            className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deleting === cambio.id_cambio ? "..." : "Eliminar"}
                          </Button>
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
          Mostrando {filteredCambios.length} de {cambios.length} cambios
        </div>
      </CardContent>
    </Card>
  )
}
