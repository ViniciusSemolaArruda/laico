const religions = [
  'Católicos e Protestantes',
  'Islamismo',
  'Judaísmo',
  'Hinduísmo',
  'Budismo',
  'Espiritismo',
  'Matriz Africana',
  'Povos Originários',
  'Quilombolas',
  'Ciganos',
  'Ortodoxos',
  'Anglicanismo',
]

export default function SidebarFilter() {
  return (
    <aside className="rounded-2xl border bg-white p-6">
      <h2 className="mb-6 text-xl font-semibold">
        Filtrar produtos
      </h2>

      <div className="space-y-4">
        {religions.map((item) => (
          <label key={item} className="flex gap-3">
            <input type="checkbox" />
            {item}
          </label>
        ))}
      </div>

      <button className="mt-8 w-full rounded-xl bg-[#b8860b] py-3 text-white">
        Filtrar
      </button>
    </aside>
  )
}