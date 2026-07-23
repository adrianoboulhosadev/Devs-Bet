'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { useLogin } from '../hooks/use-login'

export function Login() {
  const { form, error, onSubmit, submitting } = useLogin()
  const { register } = form

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Entrar</h1>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Field label="E-mail" type="email" required {...register('email')} />
        <Field label="Senha" type="password" required {...register('password')} />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Não tem conta?{' '}
          <Link href="/register" className="font-medium text-slate-900 underline">
            Criar conta
          </Link>
        </p>
      </form>
    </main>
  )
}
