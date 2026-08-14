'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Holds the file waiting to be cropped and the object URL of the cropped
 * result, keeping both in sync with the form's controlled value.
 */
export function useImagePicker(value: File | null) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  return {
    inputRef,
    pending,
    setPending,
    previewUrl,
    // Clearing the input's own value matters: picking the SAME file twice in a
    // row fires no change event otherwise, and the cropper would never reopen.
    resetInput: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
  }
}
