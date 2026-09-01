export function BarraProgreso({
  completados,
  total,
}: {
  completados: number
  total: number
}) {
  const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0

  return (
    <div>
      <div className="flex justify-between text-sm mb-1 text-slate-600">
        <span>
          {completados} de {total} completados
        </span>
        <span className="font-medium">{porcentaje}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-100">
        <div
          className="h-2.5 rounded-full bg-[#dc2626] transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}