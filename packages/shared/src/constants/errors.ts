/**
 * Domain error codes. Just stable strings — the HTTP layer (adapters/backend)
 * maps each code to a status. Keeps the domain agnostic of HTTP.
 */
export const Errors = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',

  // shared / money
  INVALID_AMOUNT: 'INVALID_AMOUNT',

  // auth
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_PASSWORD_HASH: 'INVALID_PASSWORD_HASH',
  PASSWORDS_DO_NOT_MATCH: 'PASSWORDS_DO_NOT_MATCH',
  NAME_REQUIRED: 'NAME_REQUIRED',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_EMAIL_OR_PASSWORD: 'INVALID_EMAIL_OR_PASSWORD',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_SAME_AS_PREVIOUS: 'PASSWORD_SAME_AS_PREVIOUS',
  INVALID_SESSION: 'INVALID_SESSION',
  NOT_ADMIN: 'NOT_ADMIN',
  // Signed up but an admin has not released the account yet. A REJECTED account
  // never gets this code — it answers INVALID_EMAIL_OR_PASSWORD, so being barred
  // is indistinguishable from a wrong password.
  ACCOUNT_PENDING_APPROVAL: 'ACCOUNT_PENDING_APPROVAL',
  OAUTH_TOKEN_INVALID: 'OAUTH_TOKEN_INVALID',
  OAUTH_EMAIL_NOT_VERIFIED: 'OAUTH_EMAIL_NOT_VERIFIED',

  // wallet
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_STAKE: 'INVALID_STAKE',
  WITHDRAWAL_TOO_LARGE: 'WITHDRAWAL_TOO_LARGE',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_SETTLED: 'PAYMENT_ALREADY_SETTLED',
  RECEIPT_REQUIRED: 'RECEIPT_REQUIRED',
  REJECTION_REASON_REQUIRED: 'REJECTION_REASON_REQUIRED',
  DEPOSIT_LIMIT_EXCEEDED: 'DEPOSIT_LIMIT_EXCEEDED',
  // Too many money moves hit the same wallet at once and the database kept
  // refusing the interleaving (see the apps' inMoneyTransaction). Transient:
  // nothing was written and the very same request works on a retry.
  WALLET_BUSY: 'WALLET_BUSY',
  SELF_EXCLUDED: 'SELF_EXCLUDED',
  ALREADY_SELF_EXCLUDED: 'ALREADY_SELF_EXCLUDED',

  // match
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MATCH_NOT_OPEN: 'MATCH_NOT_OPEN',
  MATCH_ALREADY_SETTLED: 'MATCH_ALREADY_SETTLED',
  NOT_A_PARTICIPANT: 'NOT_A_PARTICIPANT',
  NOT_ENOUGH_PARTICIPANTS: 'NOT_ENOUGH_PARTICIPANTS',
  INVALID_MATCH_STATUS: 'INVALID_MATCH_STATUS',
  SCHEDULED_IN_PAST: 'SCHEDULED_IN_PAST',
  DRAW_NOT_ALLOWED: 'DRAW_NOT_ALLOWED',
  INVALID_BEST_OF: 'INVALID_BEST_OF',
  INVALID_UNIT_NUMBER: 'INVALID_UNIT_NUMBER',
  RESULT_PROOF_REQUIRED: 'RESULT_PROOF_REQUIRED',

  // betting
  BETTING_CLOSED: 'BETTING_CLOSED',
  BET_NOT_FOUND: 'BET_NOT_FOUND',
  // The bet/ticket already settled (won/lost/refunded), so there is nothing to cancel.
  BET_NOT_OPEN: 'BET_NOT_OPEN',
  INVALID_COMBO_LEGS: 'INVALID_COMBO_LEGS',
  DUPLICATE_COMBO_MARKET: 'DUPLICATE_COMBO_MARKET',
  INVALID_COMBO_ODD: 'INVALID_COMBO_ODD',
  STAKE_LIMIT_EXCEEDED: 'STAKE_LIMIT_EXCEEDED',

  // category
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_NOT_LEAF: 'CATEGORY_NOT_LEAF',
  CATEGORY_HAS_CHILDREN: 'CATEGORY_HAS_CHILDREN',
  CATEGORY_ALREADY_EXISTS: 'CATEGORY_ALREADY_EXISTS',

  // participant
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  PARTICIPANT_ALREADY_EXISTS: 'PARTICIPANT_ALREADY_EXISTS',
  PARTICIPANT_IN_USE: 'PARTICIPANT_IN_USE',

  // notification
  // Also answered when the notification belongs to SOMEONE ELSE (anti-IDOR):
  // a foreign notification is indistinguishable from a missing one, same as
  // BET_NOT_FOUND in CancelBet.
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',

  // comment
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  COMMENT_TOO_LONG: 'COMMENT_TOO_LONG',
  // The match/tournament being commented on does not exist (the backend resolves
  // it cross-context and hands the use case a boolean — same shape as categoryIsLeaf).
  COMMENT_SUBJECT_NOT_FOUND: 'COMMENT_SUBJECT_NOT_FOUND',
  // A reply always hangs off a ROOT comment: the thread is two levels deep, like
  // Facebook's. Also answered when the parent belongs to another match/tournament.
  INVALID_COMMENT_PARENT: 'INVALID_COMMENT_PARENT',
  // Only the author edits (and withdraws) their own text; the admin is the one
  // who can delete anybody's for good.
  NOT_COMMENT_AUTHOR: 'NOT_COMMENT_AUTHOR',
  // The comment was withdrawn by its author (soft delete): it cannot be edited
  // and no new reply hangs off it — what is already there stays visible.
  COMMENT_DELETED: 'COMMENT_DELETED',

  // poll (open questions: "quando fulano vai ser demitido?")
  POLL_NOT_FOUND: 'POLL_NOT_FOUND',
  POLL_NOT_OPEN: 'POLL_NOT_OPEN',
  POLL_ALREADY_SETTLED: 'POLL_ALREADY_SETTLED',
  // The result was declared while betting was still open (or on a poll already
  // called off) — a poll is only resolved from `closed`.
  INVALID_POLL_STATUS: 'INVALID_POLL_STATUS',
  NOT_ENOUGH_POLL_OPTIONS: 'NOT_ENOUGH_POLL_OPTIONS',
  TOO_MANY_POLL_OPTIONS: 'TOO_MANY_POLL_OPTIONS',
  // Two options that read the same to a human ("Sim" and "sim ").
  DUPLICATE_POLL_OPTION: 'DUPLICATE_POLL_OPTION',
  // The declared winner is not one of this poll's own options.
  INVALID_POLL_OPTION: 'INVALID_POLL_OPTION',
  POLL_QUESTION_TOO_LONG: 'POLL_QUESTION_TOO_LONG',
  POLL_OPTION_TOO_LONG: 'POLL_OPTION_TOO_LONG',
  // A poll without a written criterion is unjudgeable — see ResolutionCriteria.
  RESOLUTION_CRITERIA_TOO_LONG: 'RESOLUTION_CRITERIA_TOO_LONG',

  // tournament
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  INVALID_TOURNAMENT_SIZE: 'INVALID_TOURNAMENT_SIZE',
  NOT_ENOUGH_TOURNAMENT_PARTICIPANTS: 'NOT_ENOUGH_TOURNAMENT_PARTICIPANTS',
  DUPLICATE_PARTICIPANT_NAME: 'DUPLICATE_PARTICIPANT_NAME',
  TOURNAMENT_NOT_OPEN: 'TOURNAMENT_NOT_OPEN',
  TOURNAMENT_ALREADY_FINISHED: 'TOURNAMENT_ALREADY_FINISHED',
  BRACKET_SLOT_NOT_FOUND: 'BRACKET_SLOT_NOT_FOUND',
} as const

export type ErrorCode = (typeof Errors)[keyof typeof Errors]
