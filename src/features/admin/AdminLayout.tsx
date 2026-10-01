import type { CSSProperties } from 'react'
import { BookOpenText, ClipboardList, PanelLeft, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PageContainer } from '../../app/components/PageContainer'
import { Button } from '../../app/components/ui/button'
import { Separator } from '../../app/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
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

const sections = [
  { group: 'Catalog', title: 'Books', to: '/admin/books', icon: BookOpenText },
  { group: 'Sales', title: 'Order requests', to: '/admin/orders', icon: ClipboardList },
]

function AdminNavigation() {
  const { setOpenMobile, isMobile } = useSidebar()
  const { pathname } = useLocation()
  return (
    <>
      <SidebarTrigger
        type="button"
        aria-controls="admin-navigation"
        className="mb-4 h-auto w-full justify-start gap-3 px-4 py-3 text-sm font-bold lg:hidden"
      >
        <PanelLeft size={18} aria-hidden="true" /> Admin menu
      </SidebarTrigger>
      <Sidebar className="absolute h-full rounded-lg border border-sidebar-border [&_[data-slot=sidebar-inner]]:rounded-lg">
        {isMobile && (
          <SidebarHeader className="flex-row items-center justify-between border-b border-sidebar-border px-4 py-3">
            <span className="text-sm font-semibold">Admin navigation</span>
            <Button type="button" variant="ghost" aria-label="Close admin menu" className="size-9" onClick={() => setOpenMobile(false)}>
              <X size={18} aria-hidden="true" />
            </Button>
          </SidebarHeader>
        )}
        <SidebarContent className="py-4">
          <nav id="admin-navigation" aria-label="Admin navigation">
            {sections.map(({ group, title, to, icon: Icon }) => (
              <SidebarGroup key={to}>
                <SidebarGroupLabel className="eyebrow px-4">{group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        isActive={pathname === to || pathname.startsWith(`${to}/`)}
                        className="gap-3 px-4 font-semibold text-[#526b57] focus-visible:ring-[#28593f] data-[active=true]:bg-[#28593f] data-[active=true]:text-white"
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
      </Sidebar>
    </>
  )
}

export function AdminLayout() {
  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5 pb-6">
        <div>
          <p className="eyebrow">Store administration</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">The Quiet Shelf admin</h1>
        </div>
        <Button asChild variant="ghost">
          <Link to="/">Back to store</Link>
        </Button>
      </div>
      <Separator className="mb-6" />
      <SidebarProvider
        open
        onOpenChange={() => {}}
        style={{ '--sidebar-width': '14rem' } as CSSProperties}
        className="relative min-h-64 flex-col gap-0 lg:flex-row lg:gap-10"
      >
        <AdminNavigation />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </SidebarProvider>
    </PageContainer>
  )
}
