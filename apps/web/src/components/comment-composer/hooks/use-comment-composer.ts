'use client'

import { useForm } from 'react-hook-form'

interface Fields {
  body: string
}

/** The text box's own state. Clears itself after a successful submit unless the
 * caller is editing (where the box closes instead of being reused). */
export function useCommentComposer(
  initialValue: string,
  onSubmit: (body: string) => void,
  clearOnSubmit: boolean,
) {
  const form = useForm<Fields>({ defaultValues: { body: initialValue } })
  const body = form.watch('body') ?? ''

  const submit = form.handleSubmit((fields) => {
    const text = fields.body.trim()
    if (!text) return
    onSubmit(text)
    if (clearOnSubmit) form.reset({ body: '' })
  })

  return { form, body, submit }
}
