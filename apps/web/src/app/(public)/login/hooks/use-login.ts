'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import type { LoginUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { useGoogleOAuthBridge } from '@/hooks/use-google-oauth-bridge'
import { notify } from '@/lib/notify'

export function useLogin() {
  const { login } = useAuth()
  const router = useRouter()

  const form = useForm<LoginUserInput>({ defaultValues: { email: '', password: '' } })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await login(data)
      router.replace('/dashboard')
    } catch (failure) {
      notify.failure(failure, 'E-mail ou senha inválidos.')
    }
  })

  const onGoogleSuccess = useCallback(() => router.replace('/dashboard'), [router])
  useGoogleOAuthBridge(onGoogleSuccess)

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
