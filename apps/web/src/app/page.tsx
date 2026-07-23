import { redirect } from 'next/navigation'

// The root has no screen of its own: it sends to the dashboard, and the private
// layout decides whether to allow it or redirect to login.
export default function RootPage() {
  redirect('/dashboard')
}
