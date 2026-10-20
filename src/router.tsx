import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { StockPage } from './pages/StockPage'
import { DropDetailPage } from './pages/DropDetailPage'
import { DropsPage } from './pages/DropsPage'
import { FabricDetailPage } from './pages/FabricDetailPage'
import { FabricTypeDetailPage } from './pages/FabricTypeDetailPage'
import { FabricTypesPage } from './pages/FabricTypesPage'
import { PatternsPage } from './pages/PatternsPage'
import { SupplierDetailPage } from './pages/SupplierDetailPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { StockInPage } from './pages/StockInPage'
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

const stockInRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/in',
  component: StockInPage,
})

const fabricRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/fabric/$fabricId',
  component: FabricRouteComponent,
})

function FabricRouteComponent() {
  const { fabricId } = fabricRoute.useParams()
  return <FabricDetailPage key={fabricId} fabricId={fabricId} />
}

const dropsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/drops',
  component: DropsPage,
})

const dropRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/drops/$dropId',
  component: DropRouteComponent,
})

function DropRouteComponent() {
  const { dropId } = dropRoute.useParams()
  return <DropDetailPage key={dropId} dropId={dropId} />
}

const suppliersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/suppliers',
  component: SuppliersPage,
})

const supplierRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/suppliers/$supplierId',
  component: SupplierRouteComponent,
})

function SupplierRouteComponent() {
  const { supplierId } = supplierRoute.useParams()
  return <SupplierDetailPage key={supplierId} supplierId={supplierId} />
}

const fabricTypesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/fabric-types',
  component: FabricTypesPage,
})

const fabricTypeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/fabric-types/$typeId',
  component: FabricTypeRouteComponent,
})

function FabricTypeRouteComponent() {
  const { typeId } = fabricTypeRoute.useParams()
  return <FabricTypeDetailPage key={typeId} typeId={typeId} />
}

const patternsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/patterns',
  component: PatternsPage,
})

const usageRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/out',
  validateSearch: (search: Record<string, unknown>): { lot?: string } => ({
    lot: typeof search.lot === 'string' && search.lot ? search.lot : undefined,
  }),
  component: UsageRouteComponent,
})

function UsageRouteComponent() {
  const { lot } = usageRoute.useSearch()
  return <UsagePage key={lot ?? 'all'} lotFilter={lot} />
}

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([stockRoute, fabricRoute, dropsRoute, dropRoute, suppliersRoute, supplierRoute, fabricTypesRoute, fabricTypeRoute, patternsRoute, stockInRoute, usageRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
