'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function MenuDropdown({
  nombre,
  rolLabel,
}: {
  nombre: string
  rolLabel: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm outline-none">
        <div className="h-8 w-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="font-medium leading-none">{nombre}</p>
          <p className="text-xs text-gray-500">{rolLabel}</p>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{nombre}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-[#dc2626]">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}