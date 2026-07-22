export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { CambiosTable } from "@/components/cambios/cambios-table"
import { CambiosStats } from "@/components/cambios/cambios-stats"
import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

async function getCambiosData() {
  try {
    const cambiosRaw = await sql`
      SELECT 
        c.id_cambio, c.fecha, c.motivo, c.estado, c.observaciones, c.nombre_cliente,
        cl.razon_social as cliente_razon_social
      FROM cambios c
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.created_at DESC
    `

    const detalles = await sql`
      SELECT 
        cd.id_cambio,
        pe.descripcion as ent_nombre, pe.codigo_sku as ent_sku, pe.talle as ent_talle, pe.color as ent_color,
        pr.descripcion as rec_nombre, pr.codigo_sku as rec_sku, pr.talle as rec_talle, pr.color as rec_color
      FROM cambios_detalle cd
      LEFT JOIN productos pe ON cd.id_producto_entregado = pe.id_producto
      LEFT JOIN productos pr ON cd.id_producto_recibido = pr.id_producto
    `

    const detallesPorCambio: Record<number, Array<{ ent_nombre: string; ent_sku: string; ent_talle: string | null; ent_color: string | null; rec_nombre: string; rec_sku: string; rec_talle: string | null; rec_color: string | null }>> = {}
    for (const d of detalles) {
      if (!detallesPorCambio[d.id_cambio]) detallesPorCambio[d.id_cambio] = []
      detallesPorCambio[d.id_cambio].push(d)
    }

    const cambios = cambiosRaw.map((c: any) => ({
      ...c,
      detalles: detallesPorCambio[c.id_cambio] || [],
    }))

    const [stats] = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'completado') as completados,
        COUNT(*) FILTER (WHERE fecha >= date_trunc('month', CURRENT_DATE)) as mes_actual
      FROM cambios
    `

    return {
      cambios: cambios || [],
      stats: {
        total: Number(stats?.total || 0),
        pendientes: Number(stats?.pendientes || 0),
        completados: Number(stats?.completados || 0),
        mesActual: Number(stats?.mes_actual || 0),
      },
    }
  } catch (error) {
    console.error("Error fetching cambios:", error)
    return {
      cambios: [],
      stats: { total: 0, pendientes: 0, completados: 0, mesActual: 0 },
    }
  }
}

export default async function CambiosPage() {
  const { cambios, stats } = await getCambiosData()

  return (
    <div className="flex flex-col">
      <Header title="Cambios" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestión de Cambios</h2>
            <p className="text-sm text-muted-foreground">
              Registra cambios de productos. El stock se descuenta al crear y se repone al completar.
            </p>
          </div>
          <Link href="/cambios/nuevo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cambio
            </Button>
          </Link>
        </div>

        <CambiosStats stats={stats} />
        <CambiosTable cambios={cambios} />
      </div>
    </div>
  )
}
