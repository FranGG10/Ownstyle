"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfiguracionGeneral } from "./configuracion-general"
import { ProveedoresList } from "./proveedores-list"
import { ClientesList } from "./clientes-list"
import { ReglasContablesList } from "./reglas-contables-list"
import { Settings, Building, Users, BookOpen } from "lucide-react"

interface ConfiguracionTabsProps {
  data: {
    configuraciones: any[]
    proveedores: any[]
    clientes: any[]
    planCuentas: any[]
    reglasContables: any[]
  }
}

export function ConfiguracionTabs({ data }: ConfiguracionTabsProps) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
        <TabsTrigger value="general" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">General</span>
        </TabsTrigger>
        <TabsTrigger value="proveedores" className="gap-2">
          <Building className="h-4 w-4" />
          <span className="hidden sm:inline">Proveedores</span>
        </TabsTrigger>
        <TabsTrigger value="clientes" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Clientes</span>
        </TabsTrigger>
        <TabsTrigger value="reglas" className="gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Reglas Contables</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <ConfiguracionGeneral configuraciones={data.configuraciones} />
      </TabsContent>

      <TabsContent value="proveedores">
        <ProveedoresList proveedores={data.proveedores} />
      </TabsContent>

      <TabsContent value="clientes">
        <ClientesList clientes={data.clientes} />
      </TabsContent>

      <TabsContent value="reglas">
        <ReglasContablesList reglas={data.reglasContables} planCuentas={data.planCuentas} />
      </TabsContent>
    </Tabs>
  )
}
