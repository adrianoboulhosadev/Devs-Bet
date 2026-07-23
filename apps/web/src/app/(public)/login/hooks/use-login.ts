'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { LoginUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { errorMessage } from '@/lib/api/errors'

export function useLogin() {
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginUserInput>({ defaultValues: { email: '', password: '' } })

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null)
    try {
      await login(data)
      router.replace('/dashboard')
    } catch (failure) {
      setError(errorMessage(failure, 'E-mail ou senha inválidos.'))
    }
  })

  return { form, error, onSubmit, submitting: form.formState.isSubmitting }
}
