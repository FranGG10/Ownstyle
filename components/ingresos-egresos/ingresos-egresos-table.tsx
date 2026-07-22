"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, CreditCard, Banknote, Building2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { deleteIngresoEgreso } from "@/app/actions/ingresos-egresos"
import { useRouter } from "next/navigation"

interface IngresoEgreso {
  id_ingreso_egreso: number
  fecha: string
  tipo: string
  categoria: string
  descripcion: string
  monto: number
  medio_pago: string
  cuenta_nombre: string
  cuenta_codigo: string
}

const RUBROS_LABELS: Record<string, string> = {
  publicidad: "Publicidad",
  contador: "Contador",
  gastos_varios: "Gastos Varios",
  otros_ingresos: "Otros Ingresos",
  impuestos: "Impuestos",
}

const RUBROS_COLORS: Record<string, string> = {
  publicidad: "bg-blue-500/10 text-blue-600 border-blue-200",
  contador: "bg-purple-500/10 text-purple-600 border-purple-200",
  gastos_varios: "bg-slate-500/10 text-slate-600 border-slate-200",
  otros_ingresos: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  impuestos: "bg-amber-500/10 text-amber-600 border-amber-200",
}

const getMedioPagoIcon = (medioPago: string) => {
  switch (medioPago?.toLowerCase()) {
    case "efectivo":
      return <Banknote className="h-4 w-4 text-emerald-600" />
    case "transferencia":
      return <Building2 className="h-4 w-4 text-blue-600" />
    default:
      return <CreditCard className="h-4 w-4 text-purple-600" />
  }
}

export function IngresosEgresosTable({ movimientos }: { movimientos: IngresoEgreso[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este movimiento?")) return

    setDeleting(id)
    const result = await deleteIngresoEgreso(id)
    setDeleting(null)

    if (result.success) {
      router.refresh()
    } else {
      alert("Error al eliminar: " + result.error)
    }
  }

  if (movimientos.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No hay movimientos registrados</div>
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="font-semibold">Fecha</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">Rubro</TableHead>
            <TableHead className="font-semibold">Descripción</TableHead>
            <TableHead className="font-semibold">Medio de Pago</TableHead>
            <TableHead className="font-semibold">Cuenta Contable</TableHead>
            <TableHead className="text-right font-semibold">Monto</TableHead>
            <TableHead className="text-right font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimientos.map((mov, index) => (
            <TableRow
              key={mov.id_ingreso_egreso}
              className={`transition-colors hover:bg-purple-50/50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
            >
              <TableCell className="font-medium">{formatDate(mov.fecha)}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    mov.tipo === "ingreso"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                      : "bg-red-500/10 text-red-600 border-red-200"
                  }
                >
                  {mov.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={RUBROS_COLORS[mov.categoria] || "bg-slate-100"}>
                  {RUBROS_LABELS[mov.categoria] || mov.categoria}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-slate-600">{mov.descripcion}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 capitalize">
                  {getMedioPagoIcon(mov.medio_pago)}
                  {mov.medio_pago}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono text-slate-500">{mov.cuenta_codigo}</span>
                <span className="text-slate-400 mx-1">-</span>
                <span className="text-sm">{mov.cuenta_nombre}</span>
              </TableCell>
              <TableCell
                className={`text-right font-semibold tabular-nums ${mov.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"}`}
              >
                {mov.tipo === "ingreso" ? "+" : "-"} {formatCurrency(mov.monto)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(mov.id_ingreso_egreso)}
                  disabled={deleting === mov.id_ingreso_egreso}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
