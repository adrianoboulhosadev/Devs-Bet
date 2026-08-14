/**
 * The draw is a betting selection like any other when the match allows it —
 * it has its own pool and odd. Mirrors MATCH_DRAW_SELECTION_ID in
 * packages/match/core (the front cannot import a core package directly).
 *
 * Global because it is read by two different routes: the match detail (where
 * the draw is offered) and the combo list (which labels a settled leg).
 */
export const MATCH_DRAW_SELECTION_ID = 'draw'
