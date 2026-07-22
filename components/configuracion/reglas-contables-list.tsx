"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookOpen } from "lucide-react"

interface ReglaContable {
  id_regla: number
  tipo_movimiento: string
  concepto: string
  id_cuenta: number
  tipo_partida: string
  descripcion: string
  codigo: string
  cuenta_nombre: string
  activo: boolean
}

interface ReglasContablesListProps {
  reglas: ReglaContable[]
  planCuentas: any[]
}

export function ReglasContablesList({ reglas }: ReglasContablesListProps) {
  // Group by movement type
  const ventaReglas = reglas.filter((r) => r.tipo_movimiento === "venta")
  const compraReglas = reglas.filter((r) => r.tipo_movimiento === "compra")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Reglas Contables Automáticas
          </CardTitle>
          <CardDescription>
            Configuración de las cuentas utilizadas para generar asientos automáticos en ventas y compras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reglas de Venta */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Badge variant="default">Venta</Badge>
              Asiento de Venta
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-center">Partida</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventaReglas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No hay reglas de venta configuradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventaReglas.map((regla) => (
                      <TableRow key={regla.id_regla}>
                        <TableCell className="font-medium capitalize">{regla.concepto}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{regla.codigo}</span>
                          <span className="ml-2">{regla.cuenta_nombre}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={regla.tipo_partida === "debe" ? "default" : "secondary"}>
                            {regla.tipo_partida.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{regla.descripcion}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Reglas de Compra */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Badge variant="secondary">Compra</Badge>
              Asiento de Compra
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-center">Partida</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compraReglas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No hay reglas de compra configuradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    compraReglas.map((regla) => (
                      <TableRow key={regla.id_regla}>
                        <TableCell className="font-medium capitalize">{regla.concepto}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{regla.codigo}</span>
                          <span className="ml-2">{regla.cuenta_nombre}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={regla.tipo_partida === "debe" ? "default" : "secondary"}>
                            {regla.tipo_partida.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{regla.descripcion}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">Como funcionan los asientos automáticos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Venta:</strong> Caja (Debe) + CMV (Debe) / Ventas + IVA Débito + Mercaderías (Haber)
              </li>
              <li>
                <strong>Compra:</strong> Mercaderías + IVA Crédito (Debe) / Proveedores (Haber)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
