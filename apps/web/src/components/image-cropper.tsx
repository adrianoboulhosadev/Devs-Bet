'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/button'
import { notify } from '@/lib/notify'
import { CROP_PRESETS, cropToFile, loadImage, type CropPresetName } from '@/lib/image-crop'

interface ImageCropperProps {
  file: File
  preset: CropPresetName
  onConfirm: (cropped: File) => void
  onCancel: () => void
}

// Width of the framing window inside the modal. The height follows the preset's
// aspect, so what is on screen is exactly the proportion that gets exported.
const VIEWPORT_WIDTH = 320
const MAX_ZOOM = 4
const WHEEL_STEP = 0.0015

/**
 * Lets the user frame a photo before it is uploaded: drag to move, wheel or the
 * slider to zoom. The zoom floor is "cover the window", so the frame can never
 * show empty space — there is no way to produce a half-filled image.
 *
 * Rendered into <body> for the same reason as ConfirmDialog: as a child of the
 * page, a `space-y-*` parent pushes a margin onto the fixed overlay.
 */
export function ImageCropper({ file, preset, onConfirm, onCancel }: ImageCropperProps) {
  const { aspect } = CROP_PRESETS[preset]
  const viewportHeight = Math.round(VIEWPORT_WIDTH / aspect)

  const [mounted, setMounted] = useState(false)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  // Offset of the image's centre relative to the window's centre, in screen px.
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const dragging = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)

  useEffect(() => setMounted(true), [])

  // The scale at which the image exactly covers the window — the zoom floor,
  // and where every crop starts.
  const baseScale = image
    ? Math.max(VIEWPORT_WIDTH / image.naturalWidth, viewportHeight / image.naturalHeight)
    : 1

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    let active = true

    loadImage(url)
      .then((loaded) => {
        if (!active) return
        setImage(loaded)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      })
      .catch(() => {
        if (active) notify.error('Não foi possível ler essa imagem.')
      })

    return () => {
      active = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  // Keeps the image covering the window: the centre can only travel as far as
  // the overflow allows, so no edge is ever pulled inside the frame.
  const clamp = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      if (!image) return { x: 0, y: 0 }
      const scale = baseScale * atZoom
      const limitX = Math.max(0, (image.naturalWidth * scale - VIEWPORT_WIDTH) / 2)
      const limitY = Math.max(0, (image.naturalHeight * scale - viewportHeight) / 2)
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      }
    },
    [image, baseScale, viewportHeight],
  )

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, nextZoom))
    setZoom(clamped)
    setOffset((current) => clamp(current, clamped))
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = {
      pointerId: event.pointerId,
      startX: event.clientX - offset.x,
      startY: event.clientY - offset.y,
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragging.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset(clamp({ x: event.clientX - drag.startX, y: event.clientY - drag.startY }, zoom))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current?.pointerId === event.pointerId) dragging.current = null
  }

  const confirm = async () => {
    if (!image) return
    setSaving(true)
    try {
      // Screen -> source pixels: the window's top-left corner, measured from the
      // image's centre, divided by the scale actually applied on screen.
      const scale = baseScale * zoom
      const area = {
        x: image.naturalWidth / 2 - (VIEWPORT_WIDTH / 2 + offset.x) / scale,
        y: image.naturalHeight / 2 - (viewportHeight / 2 + offset.y) / scale,
        width: VIEWPORT_WIDTH / scale,
        height: viewportHeight / scale,
      }
      onConfirm(await cropToFile(image, area, preset))
    } catch {
      notify.error('Não foi possível recortar a imagem.')
    } finally {
      setSaving(false)
    }
  }

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
