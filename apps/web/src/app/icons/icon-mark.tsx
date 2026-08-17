import { ImageResponse } from 'next/og'

type IconMarkOptions = {
  size: number
  maskable?: boolean
}

/**
 * Renders the "$" coin mark from the arcade loading spinner
 * (components/loading) as a PNG, at whatever size an icon slot needs —
 * one generator instead of five hand-drawn near-identical PNGs.
 *
 * Maskable gets extra padding (a smaller glyph on the same full-bleed
 * background): the OS applies its own shape mask over the whole square, so
 * only the center ~safe zone is guaranteed visible.
 */
export function iconMarkResponse({ size, maskable = false }: IconMarkOptions) {
  const glyphSize = maskable ? size * 0.42 : size * 0.62

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#150d26',
        }}
      >
        <div style={{ fontSize: glyphSize, fontWeight: 700, color: '#b6ff3d' }}>$</div>
      </div>
    ),
    { width: size, height: size },
  )
}
