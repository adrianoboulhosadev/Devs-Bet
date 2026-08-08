import { toast } from 'sonner'
import { errorMessage } from '@/lib/api/errors'

/**
 * The app's only feedback channel (shadcn's toast — see components/toaster).
 * Replaces the inline error banners: a toast is tied to the action that raised
 * it and expires on its own, so a stale message can never linger on screen
 * after a later action succeeds.
 */
export const notify = {
  success(message: string): void {
    toast.success(message)
  },

  error(message: string): void {
    toast.error(message)
  },

  /** Turns a request rejection into its friendly domain message (see data/error-messages). */
  failure(error: unknown, fallback?: string): void {
    toast.error(errorMessage(error, fallback))
  },
}
