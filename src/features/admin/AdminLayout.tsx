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
import {
  getAdminNavigation,
  getAdminSectionLabel,
  isAdminNavigationActive,
} from './admin-navigation'

function AdminNavigation() {
  const { role } = useAdminAccess()
  const { setOpenMobile, isMobile } = useSidebar()
  const { pathname } = useLocation()
  return (
    <Sidebar collapsible="icon">
      <div className="admin-workspace admin-navigation-shell">
        <SidebarHeader className="flex-row items-center gap-3 border-b border-sidebar-border px-5 py-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <span className="admin-brand-icon grid size-10 shrink-0 place-items-center rounded-xl">
            <BookOpenText size={19} aria-hidden="true" />
          </span>
          <div className="flex-1 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold tracking-wide">The Quiet Shelf</p>
            <p className="admin-nav-muted mt-1 text-xs">
              {role === 'STAFF' ? 'Staff workspace' : 'Admin workspace'}
            </p>
          </div>
          {isMobile && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Close admin menu"
              onClick={() => setOpenMobile(false)}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          )}
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <nav id="admin-navigation" aria-label="Admin navigation">
            {getAdminNavigation(role).map(({ group, title, to, icon: Icon }) => (
              <SidebarGroup key={to}>
                <SidebarGroupLabel className="admin-nav-muted mb-1 text-[10px] font-semibold uppercase tracking-[.16em] group-data-[collapsible=icon]:hidden">
                  {group}
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
                          aria-label={title}
                          to={to}
                          end={to === '/admin'}
                          onClick={() => setOpenMobile(false)}
                        >
                          <Icon aria-hidden="true" />
                          <span className="group-data-[collapsible=icon]:hidden">{title}</span>
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
                tooltip="Back to store"
                size="lg"
                className="justify-between group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
              >
                <Link to="/" aria-label="Back to store">
                  <span className="group-data-[collapsible=icon]:hidden">Back to store</span>
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
  const { isMobile, open } = useSidebar()
  return (
    <SidebarTrigger
      aria-label={isMobile ? 'Admin menu' : open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-controls="admin-navigation"
      className="shrink-0"
    />
  )
}

export function AdminLayout() {
  const { role } = useAdminAccess()
  const { pathname, key } = useLocation()
  const section = getAdminSectionLabel(pathname)
  return (
    <div className="admin-workspace">
      <SidebarProvider style={{ '--sidebar-width-icon': '4rem' } as React.CSSProperties}>
        <a href="#admin-main" className="admin-skip-link">
          Skip to admin content
        </a>
        <AdminNavigation />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <AdminSidebarToggle />
              <h1 className="truncate text-sm font-semibold">
                {role === 'STAFF' ? 'The Quiet Shelf staff' : 'The Quiet Shelf admin'}
              </h1>
              <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden text-sm text-muted-foreground sm:inline">{section}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <WorkspaceSearch key={`${role}:${key}`} />
              <ThemeSwitch />
              <AdminAccountMenu />
            </div>
          </header>
          <main id="admin-main" tabIndex={-1} className="p-4 outline-none sm:p-8">
            <CartFeedback workspace />
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
