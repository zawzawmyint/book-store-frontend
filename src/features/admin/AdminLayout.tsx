import { BookOpenText, ClipboardList, Users, ArrowUpRight, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../../app/components/ui/button'
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

const sections = [
  { group: 'Catalog', title: 'Books', to: '/admin/books', icon: BookOpenText },
  { group: 'Sales', title: 'Order requests', to: '/admin/orders', icon: ClipboardList },
  { group: 'People', title: 'Customers', to: '/admin/customers', icon: Users },
]

function AdminNavigation() {
  const { setOpenMobile, isMobile } = useSidebar()
  const { pathname } = useLocation()
  return (
    <Sidebar>
      <div className="admin-workspace admin-navigation-shell">
        <SidebarHeader className="flex-row items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <span className="admin-brand-icon grid size-10 shrink-0 place-items-center rounded-xl">
            <BookOpenText size={19} aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold tracking-wide">The Quiet Shelf</p>
            <p className="admin-nav-muted mt-1 text-xs">Admin workspace</p>
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
            {sections.map(({ group, title, to, icon: Icon }) => (
              <SidebarGroup key={to}>
                <SidebarGroupLabel className="admin-nav-muted mb-1 text-[10px] font-semibold uppercase tracking-[.16em]">
                  {group}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        isActive={pathname === to || pathname.startsWith(to + '/')}
                        className="admin-nav-link gap-3 rounded-lg px-3 font-medium"
                      >
                        <NavLink to={to} onClick={() => setOpenMobile(false)}>
                          <Icon aria-hidden="true" />
                          <span>{title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <Button asChild variant="ghost" className="justify-between">
            <Link to="/">
              Back to store
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const section = pathname.startsWith('/admin/orders')
    ? 'Orders'
    : pathname.startsWith('/admin/customers')
      ? 'People'
      : pathname.startsWith('/admin/profile')
        ? 'Profile'
        : 'Catalog'
  return (
    <div className="admin-workspace">
      <SidebarProvider open onOpenChange={() => {}}>
        <a href="#admin-main" className="admin-skip-link">
          Skip to admin content
        </a>
        <AdminNavigation />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger
                aria-label="Admin menu"
                aria-controls="admin-navigation"
                className="lg:hidden"
              />
              <h1 className="truncate text-sm font-semibold">The Quiet Shelf admin</h1>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden text-sm text-slate-500 sm:inline">{section}</span>
            </div>
            <AdminAccountMenu />
          </header>
          <main id="admin-main" tabIndex={-1} className="p-4 outline-none sm:p-8">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
