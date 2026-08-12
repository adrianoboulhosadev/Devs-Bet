'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageCropper } from '@/components/image-cropper'
import { CROP_PRESETS, type CropPresetName } from '@/lib/image-crop'

interface ImagePickerProps {
  label: string
  preset: CropPresetName
  // The ALREADY CROPPED file, or null. Controlled by the form (setValue).
  value: File | null
  onChange: (file: File | null) => void
}

/**
 * Replaces the plain `<Field type="file">` on the forms that upload a picture:
 * picking a file opens the cropper, and only the framed result becomes the
 * form's value. The preview below the button is that exact result, so what you
 * see is what gets uploaded.
 */
export function ImagePicker({ label, preset, value, onChange }: ImagePickerProps) {
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

  // Clearing the input's own value matters: picking the SAME file twice in a
  // row fires no change event otherwise, and the cropper would never reopen.
  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <span className="block font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">
        {label}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) setPending(file)
          resetInput()
        }}
      />

      {previewUrl ? (
        <div className="space-y-2">
          <div
            className="overflow-hidden border-3 border-arcade-border bg-[#0b0714]"
            style={{ aspectRatio: CROP_PRESETS[preset].aspect, maxWidth: 320 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="border-3 border-arcade-border px-3 py-2 font-pixel text-[9px] tracking-wide text-arcade-text hover:border-arcade-cyan hover:text-arcade-cyan"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="border-3 border-arcade-danger px-3 py-2 font-pixel text-[9px] tracking-wide text-arcade-danger hover:bg-arcade-danger hover:text-arcade-bg"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-3 border-arcade-border px-4 py-3 font-pixel text-[10px] tracking-wide text-arcade-text hover:border-arcade-cyan hover:text-arcade-cyan"
        >
          Escolher imagem
        </button>
      )}

      {pending && (
        <ImageCropper
          file={pending}
          preset={preset}
          onConfirm={(cropped) => {
            onChange(cropped)
            setPending(null)
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
