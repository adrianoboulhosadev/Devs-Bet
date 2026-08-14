/**
 * Client-side image cropping. The user frames the photo (see ImageCropper) and
 * what gets uploaded is exactly that framing — before this, the raw file went
 * up and `object-cover` decided the framing on its own, silently chopping the
 * subject out of tall or very wide photos.
 */

export type CropPresetName = 'square' | 'banner' | 'tournament'

export interface CropPreset {
  aspect: number
  // Longest edge of the exported image. Bigger than any place we render it, so
  // it still looks sharp on a retina screen, without shipping a 4000px photo.
  maxWidth: number
  maxHeight: number
}

export const CROP_PRESETS: Record<CropPresetName, CropPreset> = {
  // Avatars and participant photos are rendered in square boxes everywhere.
  square: { aspect: 1, maxWidth: 512, maxHeight: 512 },
  // Match banners: 16:9, the proportion the match cards use.
  banner: { aspect: 16 / 9, maxWidth: 1600, maxHeight: 900 },
  // Tournament banners: 3:2, taller than a match banner.
  tournament: { aspect: 3 / 2, maxWidth: 1500, maxHeight: 1000 },
}

/** Rectangle to keep, in the SOURCE image's own pixel coordinates. */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

// Transparent PNGs would turn black on a JPEG; painting the card's own surface
// colour first makes the empty parts blend into the UI instead.
const BACKDROP = '#150d26'
const JPEG_QUALITY = 0.9

/**
 * Draws `area` of `image` into an offscreen canvas at the preset's size and
 * returns it as a JPEG File.
 *
 * The name matters: the backend saves the upload as `randomUUID() +
 * extname(originalname)`, so a file not called `.jpg` would land on disk with a
 * lying extension (see apps/backend/src/upload).
 */
export async function cropToFile(
  image: HTMLImageElement,
  area: CropArea,
  presetName: CropPresetName,
): Promise<File> {
  const preset = CROP_PRESETS[presetName]

  // Never upscale: a small source stays at its own size rather than being
  // blown up into a blurry bigger file.
  const scale = Math.min(1, preset.maxWidth / area.width, preset.maxHeight / area.height)
  const width = Math.max(1, Math.round(area.width * scale))
  const height = Math.max(1, Math.round(area.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')

  context.fillStyle = BACKDROP
  context.fillRect(0, 0, width, height)
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('Could not encode the cropped image')

  return new File([blob], 'crop.jpg', { type: 'image/jpeg' })
}

/** Loads a File into an <img>, so the cropper can measure and draw it. */
export function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read the image'))
    image.src = objectUrl
  })
}
