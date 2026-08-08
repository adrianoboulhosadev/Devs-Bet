'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import type { RegisterUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { useGoogleOAuthBridge } from '@/hooks/use-google-oauth-bridge'
import { notify } from '@/lib/notify'

// The confirmation is form-only (it does not go to the backend).
type RegisterFields = RegisterUserInput & { confirmation: string }

export function useRegister() {
  const { register: registerUser } = useAuth()
  const router = useRouter()

  const form = useForm<RegisterFields>({ defaultValues: { email: '', password: '', confirmation: '' } })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await registerUser({ email: data.email, password: data.password })
      router.replace('/dashboard')
    } catch (failure) {
      notify.failure(failure, 'Não foi possível criar a conta.')
    }
  })

  // "Continuar com Google" doubles as register+login: the backend creates the
  // User on the first sign-in (see LoginWithGoogle) — same bridge as /login.
  const onGoogleSuccess = useCallback(() => router.replace('/dashboard'), [router])
  useGoogleOAuthBridge(onGoogleSuccess)

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
