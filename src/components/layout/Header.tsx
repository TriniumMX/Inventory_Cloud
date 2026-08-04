import { Fragment } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function Header({ breadcrumbs }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleName = (permisos: 1 | 2 | 3) => {
    switch (permisos) {
      case 1: return "Administrador";
      case 2: return "Editor";
      case 3: return "Consulta";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="sticky top-0 z-40 relative shrink-0 overflow-hidden"
      style={{
        background: "linear-gradient(90deg, #0d1f4e 0%, #112461 50%, #0e1f52 100%)",
        boxShadow: "0 6px 32px rgba(13,31,78,0.45), 0 2px 8px rgba(13,31,78,0.25)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Dots grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      />

      {/* Wave decorativa — sutil, en la parte inferior del header */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-[0.08]">
        <svg viewBox="0 0 1200 32" preserveAspectRatio="none" className="w-full h-8">
          <path d="M0,16 Q150,0 300,16 T600,16 T900,16 T1200,16 L1200,32 L0,32 Z" fill="#ffffff" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-[0.05]">
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="w-full h-6">
          <path d="M0,12 Q150,24 300,12 T600,12 T900,12 T1200,12 L1200,24 L0,24 Z" fill="#93c5fd" />
        </svg>
      </div>

      {/* Content row */}
      <div className="relative z-10 flex h-14 sm:h-16 w-full items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left: sidebar toggle + breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-xl h-9 w-9 sm:h-10 sm:w-10 border border-white/15 bg-white/8 flex-shrink-0" />
          <Separator orientation="vertical" className="h-4 sm:h-5 bg-white/20 flex-shrink-0" />
          <Breadcrumb className="hidden sm:block min-w-0">
            <BreadcrumbList className="text-[11px] font-bold tracking-wider uppercase flex-wrap">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-blue-200/70 hover:text-white transition-colors whitespace-nowrap"
                >
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb) => (
                <Fragment key={crumb.label}>
                  <BreadcrumbSeparator className="text-white/20" />
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="text-blue-200/70 hover:text-white transition-colors"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-white font-black">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right: status + user menu */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Connection indicator */}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-1.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase whitespace-nowrap">
              Conectado
            </span>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 sm:gap-3 h-9 sm:h-10 pl-2 sm:pl-3 pr-1 sm:pr-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30 transition-all group text-white"
                >
                  {/* Name + role */}
                  <div className="flex flex-col items-end text-right min-w-0">
                    <span className="text-[12px] font-bold text-white/90 tracking-tight leading-tight truncate max-w-[120px]">
                      {user.nombre}
                    </span>
                    <span className="text-[9px] font-extrabold text-blue-200/80 tracking-widest uppercase mt-0.5 leading-none whitespace-nowrap">
                      {getRoleName(user.permisos)}
                    </span>
                  </div>
                  {/* Avatar */}
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                    <span className="font-black text-xs tracking-wider">
                      {user.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-2xl p-2 shadow-xl border border-border bg-card"
              >
                <DropdownMenuLabel className="p-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-extrabold text-foreground leading-tight">{user.nombre}</p>
                    <p className="text-[10.5px] font-bold text-muted-foreground">@{user.usuario}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="p-3 text-red-500 font-bold hover:bg-red-500/10 hover:text-red-400 cursor-pointer rounded-xl transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
