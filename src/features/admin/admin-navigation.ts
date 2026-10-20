import { t } from '../../lib/i18n'
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
    get headerLabel() {
      return t('admin:overview')
    },
    navigation: {
      get group() {
        return t('admin:overview')
      },
      get title() {
        return t('admin:dashboard')
      },
      icon: LayoutDashboard,
    },
  },
  {
    to: '/admin/books',
    get headerLabel() {
      return t('admin:catalog')
    },
    navigation: {
      get group() {
        return t('admin:catalog')
      },
      get title() {
        return t('admin:books')
      },
      icon: BookOpenText,
    },
  },
  {
    to: '/admin/orders',
    get headerLabel() {
      return t('admin:orders')
    },
    navigation: {
      get group() {
        return t('admin:sales')
      },
      get title() {
        return t('admin:orderRequests')
      },
      icon: ClipboardList,
    },
  },
  {
    to: '/admin/users',
    get headerLabel() {
      return t('admin:people')
    },
    navigation: {
      get group() {
        return t('admin:people')
      },
      get title() {
        return t('admin:users')
      },
      icon: Users,
      adminOnly: true,
    },
  },
  {
    to: '/admin/activity',
    get headerLabel() {
      return t('admin:store')
    },
    navigation: {
      get group() {
        return t('admin:store')
      },
      get title() {
        return t('admin:activity')
      },
      icon: History,
      adminOnly: true,
    },
  },
  {
    to: '/admin/profile',
    get headerLabel() {
      return t('admin:profile')
    },
  },
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
    )?.headerLabel ?? t('admin:catalog')
  )
}

export function isAdminNavigationActive(pathname: string, to: string) {
  return pathname === to || (to !== '/admin' && pathname.startsWith(to + '/'))
}
