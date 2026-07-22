"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateConfiguracion(clave: string, valor: string) {
  try {
    await sql`
      UPDATE configuraciones 
      SET valor = ${valor}
      WHERE clave = ${clave}
    `
    revalidatePath("/configuracion")
    return { success: true }
  } catch (error) {
    console.error("Error updating configuracion:", error)
    return { success: false, error: "Error al actualizar la configuración" }
  }
}

export async function saveProveedor(formData: FormData, proveedorId?: number) {
  try {
    const data = {
      razon_social: formData.get("razon_social") as string,
      cuit: (formData.get("cuit") as string) || null,
      domicilio: (formData.get("domicilio") as string) || null,
      condicion_iva: (formData.get("condicion_iva") as string) || "Responsable Inscripto",
      telefono: (formData.get("telefono") as string) || null,
      email: (formData.get("email") as string) || null,
    }

    if (proveedorId) {
      await sql`
        UPDATE proveedores SET
          razon_social = ${data.razon_social},
          cuit = ${data.cuit},
          domicilio = ${data.domicilio},
          condicion_iva = ${data.condicion_iva},
          telefono = ${data.telefono},
          email = ${data.email}
        WHERE id_proveedor = ${proveedorId}
      `
    } else {
      await sql`
        INSERT INTO proveedores (razon_social, cuit, domicilio, condicion_iva, telefono, email)
        VALUES (${data.razon_social}, ${data.cuit}, ${data.domicilio}, ${data.condicion_iva}, ${data.telefono}, ${data.email})
      `
    }

    revalidatePath("/configuracion")
    return { success: true }
  } catch (error) {
    console.error("Error saving proveedor:", error)
    return { success: false, error: "Error al guardar el proveedor" }
  }
}

export async function saveCliente(formData: FormData, clienteId?: number) {
  try {
    const data = {
      razon_social: formData.get("razon_social") as string,
      cuit: (formData.get("cuit") as string) || null,
      domicilio: (formData.get("domicilio") as string) || null,
      condicion_iva: (formData.get("condicion_iva") as string) || "Consumidor Final",
      telefono: (formData.get("telefono") as string) || null,
      email: (formData.get("email") as string) || null,
    }

    if (clienteId) {
      await sql`
        UPDATE clientes SET
          razon_social = ${data.razon_social},
          cuit = ${data.cuit},
          domicilio = ${data.domicilio},
          condicion_iva = ${data.condicion_iva},
          telefono = ${data.telefono},
          email = ${data.email}
        WHERE id_cliente = ${clienteId}
      `
    } else {
      await sql`
        INSERT INTO clientes (razon_social, cuit, domicilio, condicion_iva, telefono, email)
        VALUES (${data.razon_social}, ${data.cuit}, ${data.domicilio}, ${data.condicion_iva}, ${data.telefono}, ${data.email})
      `
    }

    revalidatePath("/configuracion")
    return { success: true }
  } catch (error) {
    console.error("Error saving cliente:", error)
    return { success: false, error: "Error al guardar el cliente" }
  }
}
