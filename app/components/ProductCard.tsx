interface Props {
  product: {
    id: string
    name: string
    image: string
    price: number
    religion: string
  }
}

export default function ProductCard({ product }: Props) {
  return (
    <div className="rounded-2xl border bg-white p-4 transition hover:shadow-xl">
      <img
        src={product.image}
        className="h-[240px] w-full rounded-xl object-cover"
      />

      <h3 className="mt-4 text-lg font-semibold">
        {product.name}
      </h3>

      <p className="mt-1 text-sm text-neutral-500">
        {product.religion}
      </p>

      <p className="mt-4 text-3xl font-bold text-pink-600">
        R${product.price}
      </p>

      <button className="mt-4 w-full rounded-xl bg-[#b8860b] py-3 font-medium text-white">
        Ver produto
      </button>
    </div>
  )
}