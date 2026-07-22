"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { formatCurrency, formatDate } from "@/lib/format"
import { Search, BookOpen } from "lucide-react"

interface Asiento {
  id_asiento: number
  numero: number
  fecha: string
  descripcion: string
  total_debe: number
  total_haber: number
  movimiento_tipo: string
  numero_comprobante: string
}

interface LibroDiarioProps {
  asientos: Asiento[]
}

export function LibroDiario({ asientos }: LibroDiarioProps) {
  const [search, setSearch] = useState("")
  const [expandedAsientos, setExpandedAsientos] = useState<Record<number, any[]>>({})
  const [loadingAsiento, setLoadingAsiento] = useState<number | null>(null)

  const filteredAsientos = asientos.filter((a) => {
    const matchesSearch =
      a.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      a.numero_comprobante?.toLowerCase().includes(search.toLowerCase()) ||
      a.numero.toString().includes(search)
    return matchesSearch
  })

  const getMovementBadge = (tipo: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      venta: { label: "Venta", variant: "default" },
      compra: { label: "Compra", variant: "secondary" },
    }
    return variants[tipo] || { label: tipo || "Manual", variant: "outline" as const }
  }

  async function loadAsientoDetails(idAsiento: number) {
    if (expandedAsientos[idAsiento]) return

    setLoadingAsiento(idAsiento)
    try {
      const response = await fetch(`/api/asientos/${idAsiento}/detalles`)
      const detalles = await response.json()
      setExpandedAsientos((prev) => ({ ...prev, [idAsiento]: detalles }))
    } catch (error) {
      console.error("Error loading asiento details:", error)
    } finally {
      setLoadingAsiento(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Libro Diario
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar asiento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAsientos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay asientos contables registrados</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredAsientos.map((asiento) => {
                const badge = getMovementBadge(asiento.movimiento_tipo)
                return (
                  <AccordionItem
                    key={asiento.id_asiento}
                    value={asiento.id_asiento.toString()}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger
                      onClick={() => loadAsientoDetails(asiento.id_asiento)}
                      className="hover:no-underline"
                    >
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-semibold text-primary">#{asiento.numero}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(asiento.fecha)}</span>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <span className="font-medium">{asiento.descripcion}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Debe:{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatCurrency(Number(asiento.total_debe))}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            Haber:{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatCurrency(Number(asiento.total_haber))}
                            </span>
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 pb-2">
                        {loadingAsiento === asiento.id_asiento ? (
                          <div className="text-center py-4 text-muted-foreground">Cargando detalles...</div>
                        ) : expandedAsientos[asiento.id_asiento] ? (
                          <div className="rounded-md border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left py-2 px-4">Código</th>
                                  <th className="text-left py-2 px-4">Cuenta</th>
                                  <th className="text-left py-2 px-4">Descripción</th>
                                  <th className="text-right py-2 px-4">Debe</th>
                                  <th className="text-right py-2 px-4">Haber</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expandedAsientos[asiento.id_asiento].map((detalle: any, idx: number) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="py-2 px-4 font-mono text-xs">{detalle.codigo}</td>
                                    <td className="py-2 px-4 font-medium">{detalle.nombre}</td>
                                    <td className="py-2 px-4 text-muted-foreground">{detalle.descripcion}</td>
                                    <td className="py-2 px-4 text-right tabular-nums">
                                      {Number(detalle.debe) > 0 ? formatCurrency(Number(detalle.debe)) : "-"}
                                    </td>
                                    <td className="py-2 px-4 text-right tabular-nums">
                                      {Number(detalle.haber) > 0 ? formatCurrency(Number(detalle.haber)) : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
