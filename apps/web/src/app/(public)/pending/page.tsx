'use client'

import Link from 'next/link'
import { Button } from '@/components/button'

/**
 * Where a fresh sign-up lands. The account exists but has no session and no
 * access until an admin releases it — this screen exists so the person is not
 * left staring at a login that keeps refusing them.
 */
export default function PendingPage() {
  return (
    <>
      <p className="mb-5 animate-blink font-pixel text-[11px] tracking-[.3em] text-arcade-amber">
        ◄ AGUARDE SUA VEZ ►
      </p>
      <h1 className="mb-1.5 font-pixel text-4xl leading-tight text-arcade-magenta [text-shadow:0_0_18px_rgba(255,61,129,.55),5px_5px_0_#34215c]">
        DEVS<span className="text-arcade-lime">·</span>BET
      </h1>

      <div className="mt-8 space-y-5 border-3 border-arcade-amber bg-arcade-surface p-7 text-left shadow-pixel-lg">
        <h2 className="font-pixel text-xs leading-relaxed tracking-wide text-arcade-amber">
          CADASTRO EM ANÁLISE
        </h2>
        <p className="font-arcade text-xl leading-snug text-arcade-text-soft">
          Sua conta foi criada, mas o Devs-Bet é fechado: só entra quem o administrador libera.
        </p>
        <p className="font-arcade text-lg leading-snug text-arcade-text-muted">
          Assim que ele aprovar, é só entrar normalmente com o seu e-mail e senha. Enquanto isso o
          login vai continuar avisando que a conta ainda não foi liberada.
        </p>

        <Link href="/login" className="block">
          <Button variant="warning" className="w-full">
            ▸ Voltar pro login
          </Button>
        </Link>
      </div>

      <p className="mt-6 font-pixel text-[10px] tracking-[.2em] text-arcade-text-muted">
        CHAMA O ADMIN NO ZAP
      </p>
    </>
  )
}
