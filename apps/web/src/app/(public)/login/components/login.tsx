'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { useLogin } from '../hooks/use-login'

export function Login() {
  const { form, onSubmit, submitting } = useLogin()
  const { register } = form

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_50%_30%,#1c0f38_0%,#07040d_70%)] px-6 py-10">
      <div className="w-full max-w-md animate-scrIn text-center">
        <h1 className="mb-8 font-pixel text-4xl leading-tight text-arcade-magenta [text-shadow:0_0_18px_rgba(255,61,129,.55),5px_5px_0_#34215c]">
          DEVS<span className="text-arcade-lime">·</span>BET
        </h1>

        <form onSubmit={onSubmit} className="space-y-5 border-3 border-arcade-border bg-arcade-surface p-7 text-left shadow-pixel-lg">
          <Field label="E-MAIL" type="email" required {...register('email')} />
          <Field label="SENHA" type="password" required {...register('password')} />

          <Button type="submit" disabled={submitting} className="w-full animate-pulseGlow">
            {submitting ? 'Entrando…' : '▸ Inserir ficha · Entrar'}
          </Button>

          <div className="flex items-center gap-3 font-pixel text-[9px] tracking-widest text-arcade-text-muted">
            <span className="h-px flex-1 bg-arcade-border" />
            ou
            <span className="h-px flex-1 bg-arcade-border" />
          </div>

          <GoogleSignInButton />

          <p className="text-center font-arcade text-lg text-arcade-text-muted">
            Ainda não joga?{' '}
            <Link href="/register" className="underline">
              Crie seu perfil
            </Link>
          </p>
        </form>

        <p className="mt-6 animate-blink font-pixel text-[10px] tracking-[.2em] text-arcade-amber">PRESS START</p>
      </div>
    </main>
  )
}
