'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { notify } from '@/lib/notify'
import { CROP_PRESETS, cropToFile, loadImage, type CropPresetName } from '@/lib/image-crop'
import { MAX_ZOOM, VIEWPORT_WIDTH } from '../data/viewport'

interface UseImageCropperInput {
  file: File
  preset: CropPresetName
  onConfirm: (cropped: File) => void
  onCancel: () => void
}

/**
 * Everything the cropper does that is not drawing: loading the image, the
 * drag/zoom transform (clamped so the frame is always covered) and turning the
 * on-screen framing back into source pixels for the export.
 */
export function useImageCropper({ file, preset, onConfirm, onCancel }: UseImageCropperInput) {
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

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current?.pointerId === event.pointerId) dragging.current = null
  }

  return {
    viewportHeight,
    mounted,
    image,
    objectUrl,
    zoom,
    offset,
    saving,
    baseScale,
    applyZoom: (nextZoom: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(1, nextZoom))
      setZoom(clamped)
      setOffset((current) => clamp(current, clamped))
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragging.current = {
        pointerId: event.pointerId,
        startX: event.clientX - offset.x,
        startY: event.clientY - offset.y,
      }
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragging.current
      if (!drag || drag.pointerId !== event.pointerId) return
      setOffset(clamp({ x: event.clientX - drag.startX, y: event.clientY - drag.startY }, zoom))
    },
    endDrag,
    confirm: async () => {
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
    },
  }
}
