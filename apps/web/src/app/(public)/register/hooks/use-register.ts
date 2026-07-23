'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { RegisterUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { errorMessage } from '@/lib/api/errors'

// The confirmation is form-only (it does not go to the backend).
type RegisterFields = RegisterUserInput & { confirmation: string }

export function useRegister() {
  const { register: registerUser } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RegisterFields>({ defaultValues: { email: '', password: '', confirmation: '' } })

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null)
    try {
      await registerUser({ email: data.email, password: data.password })
      router.replace('/dashboard')
    } catch (failure) {
      setError(errorMessage(failure, 'Não foi possível criar a conta.'))
    }
  })

  return { form, error, onSubmit, submitting: form.formState.isSubmitting }
}
