import { join } from 'path'

// Root of the local (no-cloud) static uploads, served at /uploads/**.
export const UPLOADS_DIR = join(process.cwd(), 'uploads')

// Per-theme subfolders. Each upload endpoint writes into its own theme folder.
export const UPLOADS_SUBDIRS = ['matchs'] as const

export const MATCHS_UPLOAD_DIR = join(UPLOADS_DIR, 'matchs')
