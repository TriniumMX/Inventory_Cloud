import { NavLink } from "react-router-dom";
import {
  Package,
  Building2,
  Briefcase,
  Shield,
  FileText,
  Settings,
  Users,
  Search,
  PackageX,
  Home,
  ChevronRight,
  Warehouse,
  ClipboardList,
  UserX,
  KeyRound,
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logoFull from "@/assets/logo.png";

// Catálogo completo de opciones del sidebar.
// clave === null → siempre visible (ej. Inicio)
// clave === string → se filtra según hasModulo(clave)
const ALL_MENU_GROUPS = [
  {
    label: "",
    items: [{ title: "Inicio", url: "/", icon: Home, clave: null as null | string }],
  },
  {
    label: "INVENTARIO",
    items: [
      { title: "Bienes Muebles",   url: "/bienes-muebles",   icon: Package,   clave: "bienes-muebles" },
      { title: "Bienes Inmuebles", url: "/bienes-inmuebles", icon: Building2, clave: "bienes-inmuebles" },
      { title: "Enseres",          url: "/enseres",           icon: Briefcase, clave: "enseres" },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { title: "Almacen",           url: "/almacen",        icon: Warehouse,    clave: "almacen" },
      { title: "Resguardos",        url: "/resguardos",     icon: Shield,       clave: "resguardos" },
      { title: "Pre-Baja",          url: "/pre-baja",       icon: PackageX,     clave: "pre-baja" },
      { title: "Empleados de Baja", url: "/empleados-baja", icon: UserX,        clave: "empleados-baja" },
      { title: "Revisiones",        url: "/revisiones",     icon: Search,       clave: "revisiones" },
      { title: "Reportes",          url: "/reportes",       icon: FileText,     clave: "reportes" },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { title: "Usuarios",      url: "/usuarios",      icon: Users,         clave: "usuarios" },
      { title: "Bitácora",      url: "/auditoria",     icon: ClipboardList, clave: "auditoria" },
      { title: "Configuración", url: "/configuracion", icon: Settings,      clave: "configuracion" },
      { title: "Permisos",      url: "/permisos",      icon: KeyRound,      clave: "permisos" },
    ],
  },
  {
    label: "MI CUENTA",
    items: [
      { title: "Cambiar Contraseña", url: "/cambiar-password", icon: Lock, clave: null as null | string },
    ],
  },
];

export function AppSidebar() {
  const { open, setOpenMobile, isMobile } = useSidebar();
  const { hasModulo } = useAuth();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Filtrar items por permisos de módulo
  const menuGroups = ALL_MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.clave === null || hasModulo(item.clave)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-none z-50">
      <div
        className="relative flex flex-col h-full w-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0d1f4e 0%, #112461 55%, #0e1f52 100%)",
          boxShadow: "6px 0 32px rgba(13,31,78,0.5), 2px 0 8px rgba(13,31,78,0.3)",
        }}
      >
        {/* Dots grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-400/15 to-transparent pointer-events-none" />

        {/* Decorative waves */}
        <div className="absolute bottom-16 left-0 right-0 pointer-events-none opacity-[0.06]">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="w-full h-14">
            <path d="M0,30 Q50,0 100,30 T200,30 L200,60 L0,60 Z" fill="#ffffff" />
          </svg>
        </div>
        <div className="absolute bottom-10 left-0 right-0 pointer-events-none opacity-[0.04]">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="w-full h-10">
            <path d="M0,30 Q50,60 100,30 T200,30 L200,60 L0,60 Z" fill="#93c5fd" />
          </svg>
        </div>

        {/* Header */}
        <div
          className={cn(
            "relative z-10 flex items-end transition-all duration-300 flex-shrink-0",
            open ? "px-4 gap-3 pb-3" : "px-0 justify-center pb-3"
          )}
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
            minHeight: "calc(4rem + env(safe-area-inset-top))",
          }}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/15 border border-white/25 shadow-lg backdrop-blur-sm">
            <img src={logoFull} alt="IC" className="h-5 w-5 object-contain" />
          </div>
          {open && (
            <div className="min-w-0">
              <h1 className="text-[15px] font-black tracking-tight text-white truncate leading-tight">
                Inventory<span className="text-blue-300 font-semibold">Cloud</span>
              </h1>
              <p className="text-[9px] text-blue-300/60 font-semibold tracking-widest uppercase">
                Municipio SJR
              </p>
            </div>
          )}
        </div>

        {/* Nav Content */}
        <SidebarContent className="relative z-10 py-3 bg-transparent px-2 flex-1 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group) => (
            <SidebarGroup key={group.label} className="p-0 mb-1">
              {open && group.label && (
                <SidebarGroupLabel className="px-4 text-[9px] font-bold text-blue-300/50 tracking-[0.2em] mb-1 uppercase mt-4">
                  {group.label}
                </SidebarGroupLabel>
              )}
              {!open && group.label && (
                <div className="mx-auto my-2 h-px w-6 bg-white/10 rounded-full" />
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          cn(
                            "relative flex items-center transition-all duration-200 rounded-xl",
                            open
                              ? "gap-3 px-3 py-2.5 mx-1 min-h-[44px]"
                              : "w-10 h-10 mx-auto justify-center",
                            isActive
                              ? "bg-white/15 border border-white/20 shadow-sm"
                              : "border border-transparent hover:bg-white/8 hover:border-white/10"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <div
                                className={cn(
                                  "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-blue-300",
                                  open ? "h-6" : "h-5"
                                )}
                                style={{ boxShadow: "0 0 8px #93c5fd" }}
                              />
                            )}

                            <div
                              className={cn(
                                "flex items-center justify-center flex-shrink-0 rounded-lg transition-all duration-200",
                                open ? "w-7 h-7" : "w-8 h-8",
                                isActive
                                  ? "bg-blue-400/25 text-white"
                                  : "text-blue-200/60 hover:text-blue-100"
                              )}
                            >
                              <item.icon className="h-[17px] w-[17px]" />
                            </div>

                            {open && (
                              <span
                                className={cn(
                                  "text-[13px] flex-1 truncate font-medium tracking-wide",
                                  isActive ? "text-white font-semibold" : "text-blue-100/75"
                                )}
                              >
                                {item.title}
                              </span>
                            )}

                            {open && isActive && (
                              <ChevronRight className="h-3.5 w-3.5 text-blue-300/60 flex-shrink-0" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* Footer */}
        <div
          className={cn(
            "relative z-10 flex-shrink-0 transition-all duration-300",
            open ? "p-3" : "py-3 flex justify-center"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl transition-all duration-200",
              open ? "px-3 py-2 hover:bg-white/8 cursor-pointer" : "justify-center"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-blue-400/20 border border-blue-300/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-blue-200 tracking-wider">IC</span>
            </div>
            {open && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white/90 leading-tight">Sistema</span>
                <span className="text-[9px] text-emerald-400 font-semibold tracking-widest flex items-center gap-1.5 uppercase mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  En línea
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
