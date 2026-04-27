import { useAuth } from "@/_core/hooks/useAuth";
import { LoginPage } from "./LoginPage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Building2, Package, Truck, Warehouse, Calculator,
  Users, MapPin, DollarSign, FileText, BarChart3,
  Bell, LogOut, PanelLeft, Key,
} from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { trpc } from "@/lib/trpc";

type MenuItem = { icon: typeof LayoutDashboard; label: string; path: string; adminOnly?: boolean };

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",   path: "/dashboard" },
  { icon: Building2,       label: "Clientes",    path: "/clients" },
  { icon: Package,         label: "Pedidos",     path: "/orders" },
  { icon: Truck,           label: "Transporte",  path: "/transport" },
  { icon: Warehouse,       label: "Armazém",     path: "/warehouse" },
  { icon: Calculator,      label: "Cotação",     path: "/quotes" },
  { icon: Users,           label: "Motoristas",  path: "/drivers" },
  { icon: MapPin,          label: "Rastreamento",path: "/tracking" },
  { icon: DollarSign,      label: "Financeiro",  path: "/financial", adminOnly: true },
  { icon: FileText,        label: "Fiscal",      path: "/fiscal",    adminOnly: true },
  { icon: BarChart3,       label: "Relatórios",  path: "/reports",   adminOnly: true },
  { icon: Bell,            label: "Alertas",     path: "/alerts" },
  { icon: Key,             label: "Acessos",     path: "/access",    adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const alertsQuery = trpc.alerts.list.useQuery({ unreadOnly: true }, {
    refetchInterval: 30000,
  });
  const unreadCount = alertsQuery.data?.length ?? 0;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border"
          disableTransition={isResizing}
        >
          {/* Header */}
          <SidebarHeader className="h-[60px] justify-center border-b border-sidebar-border px-3">
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <Logo size="xs" className="min-w-0 truncate" />
              )}
              {isCollapsed && (
                <LogoMark size={22} />
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-3">
            <SidebarMenu className="px-2 gap-0.5">
              {menuItems
                .filter(item => !item.adminOnly || user?.role === "admin")
                .map(item => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-9 rounded-lg transition-all duration-150 font-medium text-sm ${
                          isActive
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                        />
                        <span className="flex items-center gap-2 flex-1">
                          {item.label}
                          {item.path === "/alerts" && unreadCount > 0 && (
                            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-l-full" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                    <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none text-foreground">
                      {user?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user?.email || "—"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border rounded-xl">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive font-medium rounded-lg"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (isCollapsed) return; setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background px-3 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9" />
              <span className="text-foreground font-semibold text-sm">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 animate-fade-in">{children}</main>
      </SidebarInset>
    </>
  );
}
