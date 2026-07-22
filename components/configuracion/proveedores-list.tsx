"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Building, Search } from "lucide-react"
import { saveProveedor } from "@/app/actions/configuracion"
import type { Proveedor } from "@/lib/db"

interface ProveedoresListProps {
  proveedores: Proveedor[]
}

export function ProveedoresList({ proveedores }: ProveedoresListProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredProveedores = proveedores.filter(
    (p) =>
      p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      p.cuit?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor)
    setIsOpen(true)
  }

  const handleNew = () => {
    setEditingProveedor(null)
    setIsOpen(true)
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      await saveProveedor(formData, editingProveedor?.id_proveedor)
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error("Error saving proveedor:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Proveedores
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
              </DialogHeader>
              <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Razón Social *</Label>
                  <Input id="razon_social" name="razon_social" defaultValue={editingProveedor?.razon_social} required />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cuit">CUIT</Label>
                    <Input id="cuit" name="cuit" defaultValue={editingProveedor?.cuit} placeholder="30-12345678-1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condicion_iva">Condición IVA</Label>
                    <Input
                      id="condicion_iva"
                      name="condicion_iva"
                      defaultValue={editingProveedor?.condicion_iva || "Responsable Inscripto"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input id="domicilio" name="domicilio" defaultValue={editingProveedor?.domicilio} />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input id="telefono" name="telefono" defaultValue={editingProveedor?.telefono} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingProveedor?.email} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay proveedores registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredProveedores.map((proveedor) => (
                  <TableRow key={proveedor.id_proveedor}>
                    <TableCell className="font-medium">{proveedor.razon_social}</TableCell>
                    <TableCell className="font-mono text-sm">{proveedor.cuit || "-"}</TableCell>
                    <TableCell>{proveedor.telefono || "-"}</TableCell>
                    <TableCell>{proveedor.email || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={proveedor.activo ? "default" : "secondary"}>
                        {proveedor.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(proveedor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
