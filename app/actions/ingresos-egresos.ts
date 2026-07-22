"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

const RUBROS_CUENTAS: Record<string, { nombre: string; codigo: string }> = {
  publicidad: { nombre: "Gastos de Publicidad", codigo: "5.4" },
  contador: { nombre: "Honorarios Profesionales", codigo: "5.5" },
  gastos_varios: { nombre: "Gastos Varios", codigo: "5.6" },
  impuestos: { nombre: "Gastos Impositivos", codigo: "5.7" },
  flete: { nombre: "Gastos Flete", codigo: "5.8" },
  alquiler: { nombre: "Alquiler Deposito", codigo: "5.9" },
  auto: { nombre: "Gastos Rodado", codigo: "5.10" },
  retiros_titular: { nombre: "Retiros del Titular", codigo: "3.3" },
  deuda_proveedores: { nombre: "Proveedores", codigo: "2.1.1" },
  deuda_familiar: { nombre: "Deuda Familiar", codigo: "2.1.3" },
  otros_ingresos: { nombre: "Otros Ingresos", codigo: "4.2" },
}

interface IngresoEgresoData {
  fecha: string
  tipo: "ingreso" | "egreso"
  categoria: string
  descripcion: string
  monto: number
  medio_pago: string
}

export async function createIngresoEgreso(data: IngresoEgresoData) {
  try {
    const rubroConfig = RUBROS_CUENTAS[data.categoria]
    if (!rubroConfig) {
      throw new Error("Rubro no válido")
    }

    const cuentaResult = await sql`
      SELECT id_cuenta FROM plan_cuentas WHERE codigo = ${rubroConfig.codigo}
    `

    if (cuentaResult.length === 0) {
      throw new Error(`Cuenta contable ${rubroConfig.codigo} no encontrada`)
    }

    const id_cuenta = cuentaResult[0].id_cuenta

    const codigoCuentaDinero = data.medio_pago === "transferencia" ? "1.1.2" : "1.1.1"
    const cuentaDineroResult = await sql`
      SELECT id_cuenta FROM plan_cuentas WHERE codigo = ${codigoCuentaDinero}
    `
    const cuentaDinero = cuentaDineroResult[0]?.id_cuenta || 3

    // Insertar el ingreso/egreso
    const result = await sql`
      INSERT INTO ingresos_egresos (fecha, tipo, categoria, descripcion, monto, id_cuenta, medio_pago)
      VALUES (${data.fecha}, ${data.tipo}, ${data.categoria}, ${data.descripcion}, ${data.monto}, ${id_cuenta}, ${data.medio_pago})
      RETURNING id_ingreso_egreso
    `

    const id_ingreso_egreso = result[0].id_ingreso_egreso

    const descripcionAsiento = data.tipo === "egreso" ? `Egreso: ${data.descripcion}` : `Ingreso: ${data.descripcion}`

    const asientoResult = await sql`
      INSERT INTO asientos (fecha, descripcion)
      VALUES (${data.fecha}, ${descripcionAsiento})
      RETURNING id_asiento
    `

    const id_asiento = asientoResult[0].id_asiento

    await sql`
      UPDATE ingresos_egresos SET id_cuenta = ${id_cuenta} WHERE id_ingreso_egreso = ${id_ingreso_egreso}
    `

    // Lógica especial para deudas (pasivos)
    const esDeuda = data.categoria === "deuda_proveedores" || data.categoria === "deuda_familiar"
    
    if (esDeuda) {
      if (data.tipo === "ingreso") {
        // Recibo dinero prestado: aumenta Caja (Debe), aumenta Deuda/Pasivo (Haber)
        await sql`
          INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
          VALUES (${id_asiento}, ${cuentaDinero}, ${data.monto}, 0)
        `
        await sql`
          INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
          VALUES (${id_asiento}, ${id_cuenta}, 0, ${data.monto})
        `
      } else {
        // Pago deuda: disminuye Deuda/Pasivo (Debe), disminuye Caja (Haber)
        await sql`
          INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
          VALUES (${id_asiento}, ${id_cuenta}, ${data.monto}, 0)
        `
        await sql`
          INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
          VALUES (${id_asiento}, ${cuentaDinero}, 0, ${data.monto})
        `
      }
    } else if (data.tipo === "egreso") {
      // Gasto normal: aumenta Gasto (Debe), disminuye Caja (Haber)
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${id_asiento}, ${id_cuenta}, ${data.monto}, 0)
      `
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${id_asiento}, ${cuentaDinero}, 0, ${data.monto})
      `
    } else {
      // Ingreso normal: aumenta Caja (Debe), aumenta Ingreso (Haber)
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${id_asiento}, ${cuentaDinero}, ${data.monto}, 0)
      `
      await sql`
        INSERT INTO asientos_detalle (id_asiento, id_cuenta, debe, haber)
        VALUES (${id_asiento}, ${id_cuenta}, 0, ${data.monto})
      `
    }

    revalidatePath("/ingresos-egresos")
    revalidatePath("/contabilidad")

    return { success: true, id: id_ingreso_egreso }
  } catch (error) {
    console.error("Error creating ingreso/egreso:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}

export async function getIngresosEgresos() {
  try {
    const result = await sql`
      SELECT 
        ie.*,
        pc.nombre as cuenta_nombre,
        pc.codigo as cuenta_codigo
      FROM ingresos_egresos ie
      LEFT JOIN plan_cuentas pc ON ie.id_cuenta = pc.id_cuenta
      ORDER BY ie.fecha DESC, ie.created_at DESC
    `
    return result
  } catch (error) {
    console.error("Error fetching ingresos/egresos:", error)
    return []
  }
}

export async function deleteIngresoEgreso(id: number) {
  try {
    // Primero obtener la descripción del ingreso/egreso para encontrar el asiento
    const ingresoEgreso = await sql`
      SELECT tipo, descripcion, fecha FROM ingresos_egresos WHERE id_ingreso_egreso = ${id}
    `

    if (ingresoEgreso.length > 0) {
      const { tipo, descripcion, fecha } = ingresoEgreso[0]
      const descripcionAsiento = tipo === "egreso" ? `Egreso: ${descripcion}` : `Ingreso: ${descripcion}`

      // Buscar y eliminar el asiento relacionado
      const asientos = await sql`
        SELECT id_asiento FROM asientos 
        WHERE descripcion = ${descripcionAsiento} AND fecha = ${fecha}
      `

      for (const asiento of asientos) {
        // Eliminar detalles del asiento
        await sql`DELETE FROM asientos_detalle WHERE id_asiento = ${asiento.id_asiento}`
        // Eliminar el asiento
        await sql`DELETE FROM asientos WHERE id_asiento = ${asiento.id_asiento}`
      }
    }

    // Eliminar el ingreso/egreso
    await sql`DELETE FROM ingresos_egresos WHERE id_ingreso_egreso = ${id}`

    revalidatePath("/ingresos-egresos")
    revalidatePath("/contabilidad")
    return { success: true }
  } catch (error) {
    console.error("Error deleting ingreso/egreso:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}
