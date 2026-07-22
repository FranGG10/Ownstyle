import { Header } from "@/components/header"
import { ProductForm } from "@/components/productos/product-form"

export default function CrearProductoPage() {
  return (
    <div className="flex flex-col">
      <Header title="Nuevo Producto" />
      <div className="p-6">
        <ProductForm />
      </div>
    </div>
  )
}
