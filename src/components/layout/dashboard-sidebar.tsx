/**
 * Dashboard Sidebar
 * Shared sidebar for the (dashboard) route group: dashboard, admin, and the
 * build pack (workshop outputs). Unlike the workshop sidebar it does NOT list
 * workshop steps — it shows top-level navigation, plus the current workshop's
 * build pack elements when the user is inside a build pack.
 */

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo, { LogoIcon } from '@/components/Logo';
import { useBuildPackNav } from '@/components/layout/build-pack-nav-context';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  isAdmin: boolean;
}

/**
 * Build pack deliverables (flat — no category headings). Mirrors SECTIONS in
 * outputs-content.tsx — hrefs are relative to /workshop/[sessionId].
 * `view` links open a deliverable detail on the outputs hub via ?view=.
 */
const BUILD_PACK_ITEMS: Array<{ label: string; icon: IconName; href: string }> = [
  { label: 'Stakeholder Presentation', icon: 'presentation', href: 'outputs?view=stakeholder-ppt' },
  { label: 'Feature Prioritization', icon: 'list-ordered', href: 'outputs/feature-prioritization' },
  { label: 'UX Journey Map', icon: 'map', href: 'outputs/journey-map' },
  { label: 'Prototype', icon: 'rocket', href: 'step/validate' },
  { label: 'Validation Plan', icon: 'clipboard-check', href: 'outputs?view=validation-plan' },
  { label: 'Technical Specs', icon: 'code', href: 'outputs/tech-specs' },
  { label: 'Product Requirements Document', icon: 'file-text', href: 'outputs/prd' },
];

/**
 * Hover / selected treatment shared with the workshop stepper sidebar:
 * hover = foreground @ 24%, selected = foreground @ 20%.
 */
const MENU_BUTTON_CLASSES =
  'transition-colors duration-150 hover:bg-foreground/24 data-[active=true]:bg-foreground/20 group-data-[collapsible=icon]:justify-center';

export function DashboardSidebar({ isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, toggleSidebar } = useSidebar();
  const { info } = useBuildPackNav();

  const collapsed = state === 'collapsed';
  const currentView = searchParams.get('view');

  const isItemActive = (href: string) => {
    if (!info) return false;
    const [path, query] = href.split('?');
    const fullPath = `/workshop/${info.sessionId}/${path}`;
    if (pathname !== fullPath) return false;
    const wantedView = query ? new URLSearchParams(query).get('view') : null;
    return wantedView === currentView;
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo + collapse toggle */}
      <SidebarHeader
        className={cn(
          'panel-header panel-header--flat group/logo flex h-16 flex-row items-center',
          collapsed ? 'justify-center px-2' : 'justify-start px-4',
        )}
      >
        {collapsed ? (
          /* Collapsed: the logo doubles as the expand control — swaps to a
             panel icon on hover */
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expand sidebar (⌘B)"
            aria-label="Expand sidebar"
            className="group/expand flex size-9 items-center justify-center rounded-full transition-colors hover:bg-olive-100 dark:hover:bg-olive-900/30"
          >
            <span className="group-hover/expand:hidden">
              <LogoIcon size="lg" />
            </span>
            <Icon
              name="panel-left"
              className="hidden h-4 w-4 text-muted-foreground group-hover/expand:block"
            />
          </button>
        ) : (
          <>
            <Logo size="md" />
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-olive-100 hover:text-foreground group-hover/logo:opacity-100 dark:hover:bg-olive-900/30"
            >
              <Icon name="panel-left" className="h-4 w-4" />
            </button>
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden p-2">
        {/* Top-level navigation */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/dashboard'}
              tooltip={collapsed ? 'Dashboard' : undefined}
              className={MENU_BUTTON_CLASSES}
            >
              <Link href="/dashboard">
                <Icon name="layout-grid" className="h-4 w-4" />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Current workshop's build pack (only while inside a build pack) */}
        {info && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive('outputs')}
                      tooltip={collapsed ? 'Build Pack' : undefined}
                      className={MENU_BUTTON_CLASSES}
                    >
                      <Link href={`/workshop/${info.sessionId}/outputs`}>
                        <Icon name="package" className="h-4 w-4" />
                        {!collapsed && <span>Build Pack</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {BUILD_PACK_ITEMS.map((item) => (
                    <SidebarMenuItem
                      key={item.label}
                      // Indent under Build Pack; flatten back out in icon mode
                      className="pl-6 group-data-[collapsible=icon]:pl-0"
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive(item.href)}
                        tooltip={collapsed ? item.label : undefined}
                        className={MENU_BUTTON_CLASSES}
                      >
                        <Link href={`/workshop/${info.sessionId}/${item.href}`}>
                          <Icon name={item.icon} className="h-4 w-4" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Admin pinned to the very bottom, clear of the main navigation */}
      {isAdmin && (
        <SidebarFooter className="mt-auto p-2 pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/admin')}
                tooltip={collapsed ? 'Admin' : undefined}
                className={MENU_BUTTON_CLASSES}
              >
                <Link href="/admin">
                  <Icon name="shield" className="h-4 w-4" />
                  {!collapsed && <span>Admin</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
