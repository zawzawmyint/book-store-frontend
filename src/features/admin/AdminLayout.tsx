import { localized, t, useI18n } from '../../lib/i18n'
import { NotificationProvider } from '../notifications/NotificationProvider'
import { NotificationBell } from '../notifications/NotificationBell'
import { BookOpenText, ArrowUpRight, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../../app/components/ui/button'
import { CartFeedback } from '../cart/CartFeedback'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '../../app/components/ui/sidebar'
import { AdminAccountMenu } from './components/AdminAccountMenu'
import { useAdminAccess } from './admin-access'
import { ThemeSwitch } from '../../app/components/ThemeSwitch'
import { WorkspaceSearch } from './components/WorkspaceSearchDialog'
import { LanguageSwitcher } from '../../app/components/LanguageSwitcher'
import {
  getAdminNavigation,
  getAdminSectionLabel,
  isAdminNavigationActive,
} from './admin-navigation'

function AdminNavigation() {
  useI18n()

  const { role } = useAdminAccess()
  const { setOpenMobile, isMobile } = useSidebar()
  const { pathname } = useLocation()
  return (
    <Sidebar collapsible="icon" side={document.documentElement.dir === 'rtl' ? 'right' : 'left'}>
      <div className="admin-workspace admin-navigation-shell">
        <SidebarHeader className="flex-row items-center gap-3 border-b border-sidebar-border px-5 py-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <span className="admin-brand-icon grid size-10 shrink-0 place-items-center rounded-xl">
            <BookOpenText size={19} aria-hidden="true" />
          </span>
          <div className="flex-1 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold tracking-wide">The Quiet Shelf</p>
            <p className="admin-nav-muted mt-1 text-xs">
              {localized(role === 'STAFF' ? t('admin:staffWorkspace') : t('admin:adminWorkspace'))}
            </p>
          </div>
          {isMobile && (
            <Button
              type="button"
              variant="ghost"
              aria-label={t('admin:closeAdminMenu')}
              onClick={() => setOpenMobile(false)}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          )}
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <nav id="admin-navigation" aria-label={t('admin:adminNavigation')}>
            {getAdminNavigation(role).map(({ group, title, to, icon: Icon }) => (
              <SidebarGroup key={to}>
                <SidebarGroupLabel className="admin-nav-muted mb-1 text-[10px] font-semibold uppercase tracking-[.16em] group-data-[collapsible=icon]:hidden">
                  {localized(group)}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={title}
                        size="lg"
                        isActive={isAdminNavigationActive(pathname, to)}
                        className="admin-nav-link gap-3 rounded-lg px-3 font-medium group-data-[collapsible=icon]:justify-center"
                      >
                        <NavLink
                          aria-label={localized(title)}
                          to={to}
                          end={to === '/admin'}
                          onClick={() => setOpenMobile(false)}
                        >
                          <Icon aria-hidden="true" />
                          <span className="group-data-[collapsible=icon]:hidden">
                            <bdi dir="auto">{localized(title)}</bdi>
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t('admin:backToStore')}
                size="lg"
                className="justify-between group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
              >
                <Link to="/" aria-label={t('admin:backToStore')}>
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('admin:backToStore')}
                  </span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}

function AdminSidebarToggle() {
  useI18n()

  const { isMobile, open } = useSidebar()
  return (
    <SidebarTrigger
      aria-label={localized(
        isMobile
          ? t('admin:adminMenu')
          : open
            ? t('admin:collapseSidebar')
            : t('admin:expandSidebar'),
      )}
      aria-controls="admin-navigation"
      className="shrink-0"
    />
  )
}

export function AdminLayout() {
  return (
    <NotificationProvider scope="WORKSPACE">
      <WorkspaceLayout />
    </NotificationProvider>
  )
}

function WorkspaceLayout() {
  useI18n()

  const { role } = useAdminAccess()
  const { pathname, key } = useLocation()
  const section = getAdminSectionLabel(pathname)
  return (
    <div className="admin-workspace">
      <SidebarProvider style={{ '--sidebar-width-icon': '4rem' } as React.CSSProperties}>
        <a href="#admin-main" className="admin-skip-link">
          {t('admin:skipToAdminContent')}
        </a>
        <AdminNavigation />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex min-h-16 flex-wrap py-2 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <AdminSidebarToggle />
              <h1 className="truncate text-sm font-semibold">
                {localized(
                  role === 'STAFF' ? t('admin:theQuietShelfStaff') : t('admin:theQuietShelfAdmin'),
                )}
              </h1>
              <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {localized(section)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher />
              <WorkspaceSearch key={`${role}:${key}`} />
              <NotificationBell />
              <ThemeSwitch />
              <AdminAccountMenu />
            </div>
          </header>
          <main id="admin-main" tabIndex={-1} className="p-4 outline-none sm:p-8">
            <CartFeedback />
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
