'use client'

import { createPortal } from 'react-dom'
import { Button } from '../button'
import type { CropPresetName } from '@/lib/image-crop'
import { MAX_ZOOM, VIEWPORT_WIDTH, WHEEL_STEP } from './data/viewport'
import { useImageCropper } from './hooks/use-image-cropper'

interface ImageCropperProps {
  file: File
  preset: CropPresetName
  onConfirm: (cropped: File) => void
  onCancel: () => void
}

/**
 * Lets the user frame a photo before it is uploaded: drag to move, wheel or the
 * slider to zoom. The zoom floor is "cover the window", so the frame can never
 * show empty space — there is no way to produce a half-filled image.
 *
 * Rendered into <body> for the same reason as ConfirmDialog: as a child of the
 * page, a `space-y-*` parent pushes a margin onto the fixed overlay.
 */
export function ImageCropper({ file, preset, onConfirm, onCancel }: ImageCropperProps) {
  const {
    viewportHeight,
    mounted,
    image,
    objectUrl,
    zoom,
    offset,
    saving,
    baseScale,
    applyZoom,
    onPointerDown,
    onPointerMove,
    endDrag,
    confirm,
  } = useImageCropper({ file, preset, onConfirm, onCancel })

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[95] grid place-items-center bg-arcade-bg/80 px-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enquadrar a imagem"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 border-3 border-arcade-magenta bg-arcade-surface p-6 shadow-pixel-lg"
      >
        <h2 className="font-pixel text-xs leading-relaxed tracking-wide text-arcade-magenta">
          ENQUADRE A IMAGEM
        </h2>

        <div
          className="relative mx-auto cursor-move touch-none overflow-hidden border-3 border-arcade-border bg-[#0b0714]"
          style={{ width: VIEWPORT_WIDTH, height: viewportHeight }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(event) => applyZoom(zoom - event.deltaY * WHEEL_STEP)}
        >
          {image && objectUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: image.naturalWidth * baseScale * zoom,
                height: image.naturalHeight * baseScale * zoom,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
        </div>

        <label className="block space-y-2">
          <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">ZOOM</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => applyZoom(Number(event.target.value))}
            className="w-full accent-arcade-magenta"
          />
        </label>

        <p className="font-arcade text-base text-arcade-text-muted">
          Arraste pra posicionar e use o zoom pra escolher o que aparece. É esse pedaço que vai ser
          salvo.
        </p>

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="success" disabled={!image || saving} onClick={confirm}>
            {saving ? 'Recortando…' : 'Usar essa imagem'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
