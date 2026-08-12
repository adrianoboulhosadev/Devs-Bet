interface LoadingProps {
  /**
   * Only for the two auth-gate guards that render BEFORE AppShell mounts —
   * `(private)/layout.tsx` and `(public)/layout.tsx`. At that moment Loading
   * IS the entire page (no header exists yet to measure against), so it has
   * to claim the viewport itself.
   */
  fullScreen?: boolean
  /**
   * For a loading state embedded inside an already-rendered section — a card
   * (StakeLimit, DepositLimits), a list slot (Matches, the admin roster) —
   * where the rest of the page is already visible around it. Claims no
   * height of its own instead of shoving a page-sized spinner into a card.
   */
  compact?: boolean
}

/**
 * The default (no props) fills its parent with `h-full`, not a fixed vh: every
 * top-level page component renders this as the SOLE child of AppShell's
 * `<main>`, which is a `flex-1` box already computed to the exact remaining
 * viewport height (screen minus header — and the header can wrap to two rows
 * on a narrow screen, changing that height). A fixed `min-h-[50vh]` could
 * never track that, which is why the old version drifted off-center depending
 * on the screen; `h-full` inherits whatever `<main>` actually measured.
 *
 * `flex flex-col` on purpose, NOT `grid` — with two stacked children, a grid
 * container's implicit rows stretch to evenly SHARE the box height and then
 * center each row independently, landing the icon and the text-plus-bar in
 * the middle of their own half instead of next to each other (a wide, wrong
 * gap between them). Flex's `justify-center` centers the pair as one group.
 */
export function Loading({ fullScreen = false, compact = false }: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${
        fullScreen ? 'min-h-screen' : compact ? 'py-8' : 'h-full min-h-[220px]'
      }`}
    >
      <span
        aria-hidden
        className={`grid animate-coinSpin place-items-center bg-arcade-magenta font-pixel text-arcade-bg ${
          compact ? 'h-6 w-6 text-[9px]' : 'h-9 w-9 text-xs'
        }`}
      >
        $
      </span>

      <div className="space-y-2.5">
        <p
          className={`font-pixel tracking-widest text-arcade-text-muted ${compact ? 'text-[9px]' : 'text-xs'}`}
        >
          CARREGANDO<span aria-hidden className="animate-blink text-arcade-amber">_</span>
        </p>

        {/* Indeterminate bar: the block's own width (w-8/w-12) times the
            -100%..300% travel of `sweep` covers exactly the track's width
            (w-32/w-48, a 4:1 ratio), so it clears both edges cleanly. */}
        <div
          className={`relative mx-auto overflow-hidden border-2 border-arcade-border bg-arcade-bg ${
            compact ? 'h-2 w-32' : 'h-3 w-48'
          }`}
        >
          <div
            className={`absolute inset-y-0 animate-sweep bg-arcade-magenta ${compact ? 'w-8' : 'w-12'}`}
          />
        </div>
      </div>
    </div>
  )
}
