import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { StockPage } from './pages/StockPage'
import { LotsPage } from './pages/LotsPage'
import { UsagePage } from './pages/UsagePage'

const rootRoute = createRootRoute({ component: () => <Outlet /> })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// Layout route with no path: wraps every signed-in page and guards access.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppLayout,
})

const stockRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: StockPage,
})

const lotsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/lots',
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === 'string' && search.edit ? search.edit : undefined,
  }),
  component: LotsRouteComponent,
})

const usageRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/usage',
  validateSearch: (search: Record<string, unknown>): { lot?: string } => ({
    lot: typeof search.lot === 'string' && search.lot ? search.lot : undefined,
  }),
  component: UsageRouteComponent,
})

function LotsRouteComponent() {
  const { edit } = lotsRoute.useSearch()
  return <LotsPage key={edit ?? 'none'} editId={edit} />
}

function UsageRouteComponent() {
  const { lot } = usageRoute.useSearch()
  return <UsagePage key={lot ?? 'all'} lotFilter={lot} />
}

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([stockRoute, lotsRoute, usageRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
