'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setLoading(false)
      setErrorMsg('Correo o contraseña incorrectos.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-slate-200/80 bg-white/95 backdrop-blur">
          <CardHeader className="text-center space-y-3 pb-4 pt-6">
              {/* Logo oficial de la empresa */}
              <div className="flex justify-center mb-2">
                  <img
                      src="/logo-ciades.png"
                      alt="CIADES I.P.S S.A.S"
                      width={240}
                      height={80}
                      className="h-auto w-auto max-h-20 object-contain"
                  />
              </div>

              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-t border-slate-100 pt-3">
                  Generador de Plantillas + Ruta del Día
              </CardDescription>
          </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Correo Electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@ciades.com"
                className="pl-9 h-10 border-slate-200 focus-visible:ring-[#dc2626] transition-all"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-9 pr-10 h-10 border-slate-200 focus-visible:ring-[#dc2626] transition-all"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
              <p className="text-xs font-semibold text-red-600">{errorMsg}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-sm shadow-md transition-all rounded-lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Ingresar al Sistema'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} CIADES • Sistema Interno
        </p>
      </CardFooter>
    </Card>
  )
}