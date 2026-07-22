import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  try {
    // Query base para asientos
    let asientosQuery
    if (desde && hasta) {
      asientosQuery = await sql`
        SELECT 
          a.*, 
          m.tipo as movimiento_tipo, 
          m.numero_comprobante,
          (SELECT COALESCE(SUM(debe), 0) FROM asientos_detalle WHERE id_asiento = a.id_asiento) as total_debe,
          (SELECT COALESCE(SUM(haber), 0) FROM asientos_detalle WHERE id_asiento = a.id_asiento) as total_haber
        FROM asientos a
        LEFT JOIN movimientos m ON a.id_movimiento = m.id_movimiento
        WHERE a.fecha >= ${desde} AND a.fecha <= ${hasta}
        ORDER BY a.fecha DESC, a.id_asiento DESC
      `
    } else {
      asientosQuery = await sql`
        SELECT 
          a.*, 
          m.tipo as movimiento_tipo, 
          m.numero_comprobante,
          (SELECT COALESCE(SUM(debe), 0) FROM asientos_detalle WHERE id_asiento = a.id_asiento) as total_debe,
          (SELECT COALESCE(SUM(haber), 0) FROM asientos_detalle WHERE id_asiento = a.id_asiento) as total_haber
        FROM asientos a
        LEFT JOIN movimientos m ON a.id_movimiento = m.id_movimiento
        ORDER BY a.fecha DESC, a.id_asiento DESC
      `
    }

    const planCuentas = await sql`
      SELECT * FROM plan_cuentas ORDER BY codigo
    `

    // Query para libro mayor con filtro de fechas
    let mayorQuery
    if (desde && hasta) {
      mayorQuery = await sql`
        SELECT 
          pc.id_cuenta,
          pc.codigo,
          pc.nombre,
          pc.tipo,
          COALESCE(SUM(ad.debe), 0) as total_debe,
          COALESCE(SUM(ad.haber), 0) as total_haber,
          CASE 
            WHEN pc.tipo IN ('activo', 'gasto') THEN COALESCE(SUM(ad.debe), 0) - COALESCE(SUM(ad.haber), 0)
            ELSE COALESCE(SUM(ad.haber), 0) - COALESCE(SUM(ad.debe), 0)
          END as saldo
        FROM plan_cuentas pc
        LEFT JOIN asientos_detalle ad ON pc.id_cuenta = ad.id_cuenta
        LEFT JOIN asientos a ON ad.id_asiento = a.id_asiento
        WHERE pc.nivel >= 2 AND (a.fecha IS NULL OR (a.fecha >= ${desde} AND a.fecha <= ${hasta}))
        GROUP BY pc.id_cuenta, pc.codigo, pc.nombre, pc.tipo
        HAVING COALESCE(SUM(ad.debe), 0) != 0 OR COALESCE(SUM(ad.haber), 0) != 0
        ORDER BY pc.codigo
      `
    } else {
      mayorQuery = await sql`
        SELECT 
          pc.id_cuenta,
          pc.codigo,
          pc.nombre,
          pc.tipo,
          COALESCE(SUM(ad.debe), 0) as total_debe,
          COALESCE(SUM(ad.haber), 0) as total_haber,
          CASE 
            WHEN pc.tipo IN ('activo', 'gasto') THEN COALESCE(SUM(ad.debe), 0) - COALESCE(SUM(ad.haber), 0)
            ELSE COALESCE(SUM(ad.haber), 0) - COALESCE(SUM(ad.debe), 0)
          END as saldo
        FROM plan_cuentas pc
        LEFT JOIN asientos_detalle ad ON pc.id_cuenta = ad.id_cuenta
        LEFT JOIN asientos a ON ad.id_asiento = a.id_asiento
        WHERE pc.nivel >= 2
        GROUP BY pc.id_cuenta, pc.codigo, pc.nombre, pc.tipo
        HAVING COALESCE(SUM(ad.debe), 0) != 0 OR COALESCE(SUM(ad.haber), 0) != 0
        ORDER BY pc.codigo
      `
    }

    // Query para summary con filtro de fechas
    let summaryQuery
    if (desde && hasta) {
      summaryQuery = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN pc.tipo = 'activo' THEN ad.debe - ad.haber ELSE 0 END), 0) as activo,
          COALESCE(SUM(CASE WHEN pc.tipo = 'pasivo' THEN ad.haber - ad.debe ELSE 0 END), 0) as pasivo,
          COALESCE(SUM(CASE WHEN pc.tipo = 'patrimonio' THEN ad.haber - ad.debe ELSE 0 END), 0) as patrimonio,
          COALESCE(SUM(CASE WHEN pc.tipo = 'ingreso' THEN ad.haber - ad.debe ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN pc.tipo = 'gasto' THEN ad.debe - ad.haber ELSE 0 END), 0) as gastos
        FROM asientos_detalle ad
        JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
        JOIN asientos a ON ad.id_asiento = a.id_asiento
        WHERE a.fecha >= ${desde} AND a.fecha <= ${hasta}
      `
    } else {
      summaryQuery = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN pc.tipo = 'activo' THEN ad.debe - ad.haber ELSE 0 END), 0) as activo,
          COALESCE(SUM(CASE WHEN pc.tipo = 'pasivo' THEN ad.haber - ad.debe ELSE 0 END), 0) as pasivo,
          COALESCE(SUM(CASE WHEN pc.tipo = 'patrimonio' THEN ad.haber - ad.debe ELSE 0 END), 0) as patrimonio,
          COALESCE(SUM(CASE WHEN pc.tipo = 'ingreso' THEN ad.haber - ad.debe ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN pc.tipo = 'gasto' THEN ad.debe - ad.haber ELSE 0 END), 0) as gastos
        FROM asientos_detalle ad
        JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
        JOIN asientos a ON ad.id_asiento = a.id_asiento
      `
    }

    const summary = summaryQuery[0]

    return NextResponse.json({
      asientos: asientosQuery || [],
      planCuentas: planCuentas || [],
      mayor: mayorQuery || [],
      summary: {
        activo: Number(summary?.activo || 0),
        pasivo: Number(summary?.pasivo || 0),
        patrimonio: Number(summary?.patrimonio || 0),
        ingresos: Number(summary?.ingresos || 0),
        gastos: Number(summary?.gastos || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching contabilidad:", error)
    return NextResponse.json({
      asientos: [],
      planCuentas: [],
      mayor: [],
      summary: { activo: 0, pasivo: 0, patrimonio: 0, ingresos: 0, gastos: 0 },
    })
  }
}
