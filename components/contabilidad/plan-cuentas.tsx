"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileSpreadsheet, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PlanCuenta } from "@/lib/db"

interface PlanCuentasProps {
  cuentas: PlanCuenta[]
}

export function PlanCuentas({ cuentas }: PlanCuentasProps) {
  const [search, setSearch] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { className: string }> = {
      activo: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      pasivo: { className: "bg-red-500/10 text-red-600 border-red-500/20" },
      patrimonio: { className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      ingreso: { className: "bg-green-500/10 text-green-600 border-green-500/20" },
      gasto: { className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    }
    return variants[tipo] || { className: "" }
  }

  const buildTree = (items: PlanCuenta[], parentId: number | null = null, level = 0): any[] => {
    return items
      .filter((item) => item.padre === parentId)
      .filter((item) => {
        if (!search) return true
        return (
          item.codigo.toLowerCase().includes(search.toLowerCase()) ||
          item.nombre.toLowerCase().includes(search.toLowerCase())
        )
      })
      .map((item) => ({
        ...item,
        level,
        children: buildTree(items, item.id_cuenta, level + 1),
      }))
  }

  const tree = buildTree(cuentas)

  const renderTreeItem = (item: any) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id_cuenta)
    const badge = getTipoBadge(item.tipo)
    const esImputable = item.nivel === 3

    return (
      <div key={item.id_cuenta}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-4 border-b hover:bg-muted/50 cursor-pointer",
            item.level > 0 && "bg-muted/20",
          )}
          style={{ paddingLeft: `${item.level * 24 + 16}px` }}
          onClick={() => hasChildren && toggleExpand(item.id_cuenta)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <span className="w-4" />
          )}
          <span className="font-mono text-sm text-muted-foreground w-16">{item.codigo}</span>
          <span className={cn("flex-1", !esImputable && "font-semibold")}>{item.nombre}</span>
          <Badge variant="outline" className={badge.className}>
            {item.tipo}
          </Badge>
          {esImputable && (
            <Badge variant="outline" className="text-xs">
              Imputable
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && item.children.map(renderTreeItem)}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Plan de Cuentas
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cuenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="flex items-center gap-2 py-2 px-4 border-b bg-muted/50 font-semibold text-sm">
            <span className="w-4" />
            <span className="w-16">Código</span>
            <span className="flex-1">Nombre</span>
            <span className="w-24 text-center">Tipo</span>
            <span className="w-20"></span>
          </div>
          {tree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron cuentas</div>
          ) : (
            tree.map(renderTreeItem)
          )}
        </div>
      </CardContent>
    </Card>
  )
}
