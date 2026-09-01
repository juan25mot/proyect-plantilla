import { MenuDropdown } from './MenuDropdown'

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operario: 'Operario',
  transportista: 'Transportista',
  auxiliar: 'Auxiliar',
}

export function Navbar({ nombre, rol }: { nombre: string; rol: string }) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div />
      <MenuDropdown nombre={nombre} rolLabel={ROL_LABELS[rol] ?? rol} />
    </header>
  )
}