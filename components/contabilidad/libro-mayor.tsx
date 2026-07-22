"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import { Search, Calculator, Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MovimientoDetalle {
  id_asiento_detalle: number
  id_asiento: number
  fecha: string
  descripcion: string
  debe: number
  haber: number
}

interface MayorEntry {
  id_cuenta: number
  codigo: string
  nombre: string
  tipo: string
  total_debe: number
  total_haber: number
  saldo: number
}

interface LibroMayorProps {
  mayor: MayorEntry[]
}

export function LibroMayor({ mayor }: LibroMayorProps) {
  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [selectedCuenta, setSelectedCuenta] = useState<MayorEntry | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoDetalle[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  const verDetalle = async (cuenta: MayorEntry) => {
    setSelectedCuenta(cuenta)
    setLoadingDetalle(true)
    try {
      const res = await fetch(`/api/contabilidad/detalle-cuenta?id_cuenta=${cuenta.id_cuenta}`)
      const data = await res.json()
      setMovimientos(data.movimientos || [])
    } catch (error) {
      console.error("Error cargando detalle:", error)
      setMovimientos([])
    } finally {
      setLoadingDetalle(false)
    }
  }

  const cerrarDetalle = () => {
    setSelectedCuenta(null)
    setMovimientos([])
  }

  const filteredMayor = mayor.filter((entry) => {
    const matchesSearch =
      entry.codigo.toLowerCase().includes(search.toLowerCase()) ||
      entry.nombre.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = filterTipo === "all" || entry.tipo === filterTipo
    return matchesSearch && matchesTipo
  })

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      activo: "Activo",
      pasivo: "Pasivo",
      patrimonio: "Patrimonio",
      ingreso: "Ingreso",
      gasto: "Gasto",
    }
    return labels[tipo] || tipo
  }

  const getSaldoColor = (tipo: string, saldo: number) => {
    if (saldo === 0) return "text-muted-foreground"

    // Normal balance by account type
    if (tipo === "activo" || tipo === "gasto") {
      return saldo > 0 ? "text-success" : "text-destructive"
    } else {
      return saldo < 0 ? "text-success" : "text-foreground"
    }
  }

  // Calculate totals
  const totals = filteredMayor.reduce(
    (acc, entry) => ({
      debe: acc.debe + Number(entry.total_debe),
      haber: acc.haber + Number(entry.total_haber),
    }),
    { debe: 0, haber: 0 },
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Libro Mayor - Saldos por Cuenta
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cuenta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pasivo">Pasivo</SelectItem>
                <SelectItem value="patrimonio">Patrimonio</SelectItem>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Total Debe</TableHead>
                <TableHead className="text-right">Total Haber</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMayor.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay cuentas con movimientos
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredMayor.map((entry) => (
                    <TableRow key={entry.id_cuenta}>
                      <TableCell className="font-mono text-sm">{entry.codigo}</TableCell>
                      <TableCell className="font-medium">{entry.nombre}</TableCell>
                      <TableCell className="capitalize">{getTipoLabel(entry.tipo)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(entry.total_debe))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(entry.total_haber))}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-semibold",
                          getSaldoColor(entry.tipo, Number(entry.saldo)),
                        )}
                      >
                        {formatCurrency(Math.abs(Number(entry.saldo)))}
                        {Number(entry.saldo) !== 0 && (
                          <span className="text-xs ml-1">{Number(entry.saldo) > 0 ? "(D)" : "(H)"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verDetalle(entry)}
                          className="h-8 w-8 p-0"
                          title="Ver detalle de movimientos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      Totales
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.debe)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.haber)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal de Detalle */}
      <Dialog open={!!selectedCuenta} onOpenChange={() => cerrarDetalle()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Detalle de Movimientos - {selectedCuenta?.codigo} {selectedCuenta?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetalle ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay movimientos para esta cuenta</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Asiento</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((mov) => (
                      <TableRow key={mov.id_asiento_detalle}>
                        <TableCell>{formatDate(mov.fecha)}</TableCell>
                        <TableCell className="font-mono text-sm">#{mov.id_asiento}</TableCell>
                        <TableCell>{mov.descripcion}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(mov.debe) > 0 ? formatCurrency(Number(mov.debe)) : "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(mov.haber) > 0 ? formatCurrency(Number(mov.haber)) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3} className="text-right">Totales</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(movimientos.reduce((sum, m) => sum + Number(m.debe), 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(movimientos.reduce((sum, m) => sum + Number(m.haber), 0))}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={3} className="text-right">Saldo</TableCell>
                      <TableCell colSpan={2} className="text-right tabular-nums">
                        {formatCurrency(Math.abs(Number(selectedCuenta?.saldo || 0)))}
                        <span className="text-xs ml-1">
                          {Number(selectedCuenta?.saldo || 0) > 0 ? "(Deudor)" : "(Acreedor)"}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
