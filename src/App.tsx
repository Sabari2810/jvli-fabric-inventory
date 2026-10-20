import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { supabaseConfigured } from './lib/supabase'

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="text-base font-semibold">Supabase is not configured</p>
        <p className="mt-2">
          Add <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_ANON_KEY</code> to a{' '}
          <code className="rounded bg-amber-100 px-1">.env</code> file for local work, or to the
          Environment Variables in your Vercel project, then restart or redeploy.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <SetupNotice />
  return <RouterProvider router={router} />
}
