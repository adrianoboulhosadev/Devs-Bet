'use client'

import { createPortal } from 'react-dom'
import { useImageLightbox } from './hooks/use-image-lightbox'

interface ImageLightboxProps {
  // The full-resolution URL to show, or null when closed.
  src: string | null
  alt: string
  onClose: () => void
}

/**
 * Full-size preview of a photo the user clicked on — same portal/backdrop/
 * Escape-to-close chrome as ConfirmDialog, so every overlay in the app closes
 * the same way.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const open = src !== null
  const { mounted } = useImageLightbox(open, onClose)

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[95] grid place-items-center bg-arcade-bg/90 p-6" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? undefined}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full border-3 border-arcade-border object-contain shadow-pixel-lg"
      />
    </div>,
    document.body,
  )
}
