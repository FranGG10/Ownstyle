import { Header } from "@/components/header"
import { ConfiguracionTabs } from "@/components/configuracion/configuracion-tabs"
import { sql } from "@/lib/db"

async function getConfigData() {
  try {
    const [configuraciones, proveedores, clientes, planCuentas, reglasContables] = await Promise.all([
      sql`SELECT * FROM configuraciones ORDER BY clave`,
      sql`SELECT * FROM proveedores ORDER BY razon_social`,
      sql`SELECT * FROM clientes ORDER BY razon_social`,
      sql`SELECT * FROM plan_cuentas WHERE nivel = 3 AND activo = true ORDER BY codigo`,
      sql`SELECT rc.*, 
          pd.codigo as cuenta_debe_codigo, pd.nombre as cuenta_debe_nombre,
          ph.codigo as cuenta_haber_codigo, ph.nombre as cuenta_haber_nombre
        FROM reglas_contables rc 
        LEFT JOIN plan_cuentas pd ON rc.cuenta_debe = pd.id_cuenta 
        LEFT JOIN plan_cuentas ph ON rc.cuenta_haber = ph.id_cuenta 
        ORDER BY rc.tipo_movimiento, rc.descripcion`,
    ])

    return {
      configuraciones: configuraciones || [],
      proveedores: proveedores || [],
      clientes: clientes || [],
      planCuentas: planCuentas || [],
      reglasContables: reglasContables || [],
    }
  } catch (error) {
    console.error("Error fetching config:", error)
    return {
      configuraciones: [],
      proveedores: [],
      clientes: [],
      planCuentas: [],
      reglasContables: [],
    }
  }
}

export default async function ConfiguracionPage() {
  const data = await getConfigData()

  return (
    <div className="flex flex-col">
      <Header title="Configuración" />
      <div className="p-6">
        <ConfiguracionTabs data={data} />
      </div>
    </div>
  )
}
