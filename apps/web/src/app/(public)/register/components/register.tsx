'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { GOOGLE_LOGIN_ENABLED } from '@/lib/features'
import { useRegister } from '../hooks/use-register'

export function Register() {
  const { form, onSubmit, submitting } = useRegister()
  const {
    register,
    getValues,
    formState: { errors },
  } = form

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_50%_30%,#1c0f38_0%,#07040d_70%)] px-6 py-10">
      <div className="w-full max-w-md animate-scrIn text-center">
        <p className="mb-5 font-pixel text-[11px] tracking-[.3em] text-arcade-cyan">◄ ARCADE DE APOSTAS ►</p>
        <h1 className="mb-1.5 font-pixel text-4xl leading-tight text-arcade-magenta [text-shadow:0_0_18px_rgba(255,61,129,.55),5px_5px_0_#34215c]">
          DEVS<span className="text-arcade-lime">·</span>BET
        </h1>
        <p className="mb-8 font-arcade text-xl text-arcade-text-muted">crie seu perfil de apostador</p>

        <form onSubmit={onSubmit} className="space-y-5 border-3 border-arcade-border bg-arcade-surface p-7 text-left shadow-pixel-lg">
          <Field label="E-MAIL" type="email" required {...register('email')} />
          <Field label="SENHA" type="password" required {...register('password')} />
          <Field
            label="CONFIRMAR SENHA"
            type="password"
            required
            error={errors.confirmation?.message}
            {...register('confirmation', {
              validate: (value) => value === getValues('password') || 'As senhas não conferem.',
            })}
          />

          <Button type="submit" disabled={submitting} className="w-full animate-pulseGlow">
            {submitting ? 'Criando…' : '▸ Criar ficha · Cadastrar'}
          </Button>

          {GOOGLE_LOGIN_ENABLED && (
            <>
              <div className="flex items-center gap-3 font-pixel text-[9px] tracking-widest text-arcade-text-muted">
                <span className="h-px flex-1 bg-arcade-border" />
                ou
                <span className="h-px flex-1 bg-arcade-border" />
              </div>

              <GoogleSignInButton />
            </>
          )}

          <p className="text-center font-arcade text-lg text-arcade-text-muted">
            Já joga?{' '}
            <Link href="/login" className="underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
