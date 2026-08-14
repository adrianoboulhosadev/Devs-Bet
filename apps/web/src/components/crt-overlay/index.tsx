/**
 * Two fixed full-screen layers that give every screen the "old CRT" texture
 * from the mockup: a flickering scanline grid, then a vignette darkening the
 * edges. Purely decorative — `pointer-events-none`, sits above the app
 * (z-index 90/91) but never intercepts clicks.
 */
export function CrtOverlay() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[90] animate-flicker opacity-[.14]"
        style={{
          background:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,.55) 0px, rgba(0,0,0,.55) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[91]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,.72) 100%)' }}
      />
    </>
  )
}
