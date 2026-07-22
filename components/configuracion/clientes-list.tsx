"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Users, Search, Star } from "lucide-react"
import { saveCliente } from "@/app/actions/configuracion"
import type { Cliente } from "@/lib/db"

interface ClientesListProps {
  clientes: Cliente[]
}

export function ClientesList({ clientes }: ClientesListProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredClientes = clientes.filter(
    (c) =>
      c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      c.cuit?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setIsOpen(true)
  }

  const handleNew = () => {
    setEditingCliente(null)
    setIsOpen(true)
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      await saveCliente(formData, editingCliente?.id_cliente)
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error("Error saving cliente:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
              </DialogHeader>
              <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Nombre / Razón Social *</Label>
                  <Input id="razon_social" name="razon_social" defaultValue={editingCliente?.razon_social} required />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cuit">CUIT/DNI</Label>
                    <Input id="cuit" name="cuit" defaultValue={editingCliente?.cuit} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condicion_iva">Condición IVA</Label>
                    <Input
                      id="condicion_iva"
                      name="condicion_iva"
                      defaultValue={editingCliente?.condicion_iva || "Consumidor Final"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input id="domicilio" name="domicilio" defaultValue={editingCliente?.domicilio} />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input id="telefono" name="telefono" defaultValue={editingCliente?.telefono} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingCliente?.email} />
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
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Razón Social</TableHead>
                <TableHead>CUIT/DNI</TableHead>
                <TableHead>Condición IVA</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay clientes registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id_cliente}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {cliente.razon_social}
                        {cliente.es_generico && <Star className="h-4 w-4 text-warning fill-warning" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{cliente.cuit || "-"}</TableCell>
                    <TableCell>{cliente.condicion_iva}</TableCell>
                    <TableCell>{cliente.telefono || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cliente.activo ? "default" : "secondary"}>
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        disabled={cliente.es_generico}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          <Star className="h-3 w-3 inline text-warning fill-warning" /> indica el cliente genérico usado por defecto en
          ventas
        </p>
      </CardContent>
    </Card>
  )
}
