import { join } from 'path'

// Root of the local (no-cloud) static uploads, served at /uploads/**.
export const UPLOADS_DIR = join(process.cwd(), 'uploads')

// Per-theme subfolders. Each upload endpoint writes into its own theme folder.
export const UPLOADS_SUBDIRS = ['matchs', 'receipts', 'participants'] as const

export const MATCHS_UPLOAD_DIR = join(UPLOADS_DIR, 'matchs')
// Deposit proof of payment (Pix receipt), uploaded by the depositing user.
export const RECEIPTS_UPLOAD_DIR = join(UPLOADS_DIR, 'receipts')
// Participant catalog photo, uploaded by the admin (see packages/participant).
export const PARTICIPANTS_UPLOAD_DIR = join(UPLOADS_DIR, 'participants')
