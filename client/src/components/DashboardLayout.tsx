import { useAuth } from "@/_core/hooks/useAuth";
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
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Building2, Package, Truck, Warehouse, Calculator,
  Users, MapPin, DollarSign, FileText, BarChart3,
  Bell, LogOut, PanelLeft, ChevronRight, Key,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";

type MenuItem = { icon: typeof LayoutDashboard; label: string; path: string; adminOnly?: boolean };

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "DASHBOARD", path: "/" },
  { icon: Building2, label: "CLIENTES", path: "/clients" },
  { icon: Package, label: "PEDIDOS (OMS)", path: "/orders" },
  { icon: Truck, label: "TRANSPORTE (TMS)", path: "/transport" },
  { icon: Warehouse, label: "ARMAZÉM (WMS)", path: "/warehouse" },
  { icon: Calculator, label: "COTAÇÃO", path: "/quotes" },
  { icon: Users, label: "MOTORISTAS", path: "/drivers" },
  { icon: MapPin, label: "RASTREAMENTO", path: "/tracking" },
  { icon: DollarSign, label: "FINANCEIRO", path: "/financial", adminOnly: true },
  { icon: FileText, label: "FISCAL", path: "/fiscal", adminOnly: true },
  { icon: BarChart3, label: "RELATÓRIOS", path: "/reports", adminOnly: true },
  { icon: Bell, label: "ALERTAS", path: "/alerts" },
  { icon: Key, label: "ACESSOS", path: "/access", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-2">
            <div className="brutal-divider mb-6" style={{ maxWidth: 120 }} />
            <h1 className="text-4xl font-bold tracking-widest text-foreground">
              TR FARIAS
            </h1>
            <p className="text-sm text-primary font-semibold tracking-[0.3em]">
              EXPRESS
            </p>
            <div className="brutal-divider mt-6" style={{ maxWidth: 120 }} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            SISTEMA DE GESTÃO LOGÍSTICA
          </p>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest text-lg"
          >
            ENTRAR
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
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
          className="border-r border-border"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold tracking-[0.15em] text-foreground text-base truncate">
                    TR FARIAS
                  </span>
                  <span className="text-primary font-bold text-xs tracking-widest">
                    EXPRESS
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.filter(item => !item.adminOnly || user?.role === "admin").map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 transition-all font-medium text-sm tracking-wider ${isActive ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span className="flex items-center gap-2">
                        {item.label}
                        {item.path === "/alerts" && unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
                            {unreadCount}
                          </span>
                        )}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border shrink-0 bg-primary/20">
                    <AvatarFallback className="text-xs font-bold text-primary bg-transparent">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none text-foreground tracking-wider">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive tracking-wider font-semibold"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>SAIR</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (isCollapsed) return; setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background px-2 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 bg-background" />
              <span className="tracking-wider text-foreground font-bold text-sm">
                {activeMenuItem?.label ?? "MENU"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
