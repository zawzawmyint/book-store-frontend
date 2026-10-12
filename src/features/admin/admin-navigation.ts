import {
  BookOpenText,
  ClipboardList,
  Users,
  History,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

type WorkspaceSection = {
  to: string
  headerLabel: string
  navigation?: {
    group: string
    title: string
    icon: LucideIcon
    adminOnly?: boolean
  }
}

const workspaceSections: readonly WorkspaceSection[] = [
  {
    to: '/admin',
    headerLabel: 'Overview',
    navigation: { group: 'Overview', title: 'Dashboard', icon: LayoutDashboard },
  },
  {
    to: '/admin/books',
    headerLabel: 'Catalog',
    navigation: { group: 'Catalog', title: 'Books', icon: BookOpenText },
  },
  {
    to: '/admin/orders',
    headerLabel: 'Orders',
    navigation: { group: 'Sales', title: 'Order requests', icon: ClipboardList },
  },
  {
    to: '/admin/users',
    headerLabel: 'People',
    navigation: { group: 'People', title: 'Users', icon: Users, adminOnly: true },
  },
  {
    to: '/admin/activity',
    headerLabel: 'Store',
    navigation: { group: 'Store', title: 'Activity', icon: History, adminOnly: true },
  },
  { to: '/admin/profile', headerLabel: 'Profile' },
]

export function getAdminNavigation(role: string | null | undefined) {
  return workspaceSections.flatMap(({ to, navigation }) =>
    navigation && (!navigation.adminOnly || role === 'ADMIN') ? [{ to, ...navigation }] : [],
  )
}

export function getAdminSectionLabel(pathname: string) {
  return (
    workspaceSections.find(({ to }) =>
      to === '/admin' ? pathname === to : pathname.startsWith(to),
    )?.headerLabel ?? 'Catalog'
  )
}

export function isAdminNavigationActive(pathname: string, to: string) {
  return pathname === to || (to !== '/admin' && pathname.startsWith(to + '/'))
}
