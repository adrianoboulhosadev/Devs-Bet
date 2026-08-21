import { join } from 'path'

// Root of the local (no-cloud) static uploads, served at /uploads/**.
export const UPLOADS_DIR = join(process.cwd(), 'uploads')

// Per-theme subfolders. Each upload endpoint writes into its own theme folder.
export const UPLOADS_SUBDIRS = ['matchs', 'receipts', 'participants', 'avatars', 'results', 'polls'] as const

export const MATCHS_UPLOAD_DIR = join(UPLOADS_DIR, 'matchs')
// Deposit proof of payment (Pix receipt), uploaded by the depositing user.
export const RECEIPTS_UPLOAD_DIR = join(UPLOADS_DIR, 'receipts')
// Participant catalog photo, uploaded by the admin (see packages/participant).
export const PARTICIPANTS_UPLOAD_DIR = join(UPLOADS_DIR, 'participants')
// Profile picture, uploaded by the user themselves (see packages/auth).
export const AVATARS_UPLOAD_DIR = join(UPLOADS_DIR, 'avatars')
// Proof photo attached to a match unit's result, uploaded by the admin
// declaring it (see MatchUnit.proofImageUrl).
export const RESULTS_UPLOAD_DIR = join(UPLOADS_DIR, 'results')
// Illustration of a poll, uploaded by the admin opening it (see packages/poll).
export const POLLS_UPLOAD_DIR = join(UPLOADS_DIR, 'polls')
