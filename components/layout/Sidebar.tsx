'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileSpreadsheet,
  Route,
  History,
  Users,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Rol = 'admin' | 'operario' | 'transportista' | 'auxiliar'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'operario', 'transportista', 'auxiliar'] },
  { href: '/generador', label: 'Generador', icon: FileSpreadsheet, roles: ['admin', 'operario'] },
  { href: '/ruta', label: 'Ruta del Día', icon: Route, roles: ['admin', 'transportista', 'auxiliar'] },
  { href: '/historial', label: 'Historial', icon: History, roles: ['admin', 'operario'] },
  { href: '/pacientes', label: 'Pacientes', icon: Users, roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
  { href: '/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
]

export function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol))

  return (
    <aside
      className={`relative shrink-0 border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Botón Flotante */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-slate-50 transition-transform active:scale-95"
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
        )}
      </button>

      {/* Cabecera del Logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-slate-200 overflow-hidden shrink-0">
        <img
          src={isCollapsed ? '/logo-iso.png' : '/logo-ciades.png'}
          alt="CIADES Logo"
          className={`transition-all duration-300 object-contain ${
            isCollapsed ? 'h-10 w-auto scale-110' : 'h-9 w-auto'
          }`}
        />
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 space-y-1 px-3 overflow-hidden">
        {items.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#dc2626] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity duration-200 ${
                  isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}