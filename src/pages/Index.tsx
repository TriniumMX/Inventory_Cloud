import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import {
  Package,
  Building2,
  Briefcase,
  Shield,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ClipboardList,
  FileCheck,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats, getActividadReciente, type DashboardStats, type ActividadReciente } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actividad, setActividad] = useState<ActividadReciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, actividadData] = await Promise.all([
          getDashboardStats(),
          getActividadReciente()
        ]);
        setStats(statsData);
        setActividad(actividadData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "d 'de' MMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <Header breadcrumbs={[]} />
        <main className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
          <div className="flex flex-col items-center gap-5 z-10 px-4 text-center">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center animate-pulse">
              <img src={logo} alt="Inventory Cloud Logo" className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-bold text-slate-700 tracking-wide">Cargando panel de control…</p>
            </div>
            <div className="w-36 h-1 bg-slate-200/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full animate-pulse w-3/5" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <Header breadcrumbs={[]} />

      <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-3 sm:space-y-5 lg:space-y-8 relative z-10">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-0" />

        {/* Hero Section */}
        <div className="relative z-10 flex flex-row items-center justify-between gap-2 sm:gap-3">
          <div className="absolute top-[-50px] right-0 w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="p-2 sm:p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
              <img src={logo} alt="Inventory Cloud Logo" className="h-7 w-7 sm:h-10 sm:w-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="notranslate text-xl sm:text-3xl font-black tracking-tight text-slate-800 leading-tight" translate="no">
                Inventory<span className="text-primary">Cloud</span>
              </h1>
              <p className="text-slate-500 text-[10px] sm:text-sm font-medium mt-0.5 truncate">
                Bienvenido, <span className="text-slate-700 font-bold">{user?.nombre || "Usuario"}</span>
                <span className="hidden md:inline"> • Panel de control</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/70 backdrop-blur-md border border-slate-200/60 px-2.5 sm:px-4 py-1 sm:py-2 rounded-2xl shadow-sm flex-shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-[9px] sm:text-[11px] font-extrabold tracking-widest text-slate-600 uppercase whitespace-nowrap">En Línea</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 relative z-10">
          <StatCard
            title="Bienes Muebles"
            value={stats?.bienesMuebles.toLocaleString('es-MX') || "0"}
            icon={Package}
            description="Activos registrados"
            loading={loading}
            accentColor="primary"
          />
          <StatCard
            title="Bienes Inmuebles"
            value={stats?.bienesInmuebles.toLocaleString('es-MX') || "0"}
            icon={Building2}
            description="Propiedades"
            loading={loading}
            accentColor="cyan"
          />
          <StatCard
            title="Enseres"
            value={stats?.enseres.toLocaleString('es-MX') || "0"}
            icon={Briefcase}
            description="Equipamiento"
            loading={loading}
            accentColor="amber"
          />
          <StatCard
            title="Resguardos"
            value={stats?.resguardosActivos.toLocaleString('es-MX') || "0"}
            icon={Shield}
            description="Bienes bajo resguardo"
            loading={loading}
            accentColor="emerald"
            breakdown={stats ? [
              { label: "Muebles", value: stats.resguardosMuebles },
              { label: "Enseres", value: stats.resguardosEnseres },
            ] : undefined}
          />
        </div>

        {/* Valor del Patrimonio */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 relative z-10">
          {/* Patrimonio Mueble */}
          <Card className="group hover:shadow-[0_15px_45px_rgba(37,99,235,0.06)] hover:scale-[1.01] hover:border-slate-200/80 transition-all duration-300 border-slate-100 border-l-4 border-l-blue-500/60 bg-white/85 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-[0_8px_30px_rgba(15,23,42,0.02)]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0" />
            <CardHeader className="relative z-10 pb-2 flex flex-row items-center gap-3 sm:gap-4 px-3 pt-3 sm:px-6 sm:pt-6">
              <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <CardTitle className="text-[10px] sm:text-[12.5px] font-extrabold text-slate-500 tracking-wider uppercase leading-tight">
                  Valor Patrimonio Mueble
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-[12px] text-slate-500 font-semibold">
                  Bienes muebles inventariados
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-0 pb-3 sm:pb-5 px-3 sm:px-6">
              {loading ? (
                <Skeleton className="h-7 sm:h-10 w-32 sm:w-48 rounded-lg" />
              ) : (
                <div className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(stats?.valorMuebles || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patrimonio Enseres */}
          <Card className="group hover:shadow-[0_15px_45px_rgba(6,182,212,0.06)] hover:scale-[1.01] hover:border-slate-200/80 transition-all duration-300 border-slate-100 border-l-4 border-l-cyan-500/60 bg-white/85 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-[0_8px_30px_rgba(15,23,42,0.02)]">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0" />
            <CardHeader className="relative z-10 pb-2 flex flex-row items-center gap-3 sm:gap-4 px-3 pt-3 sm:px-6 sm:pt-6">
              <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 transition-all duration-300 shadow-sm flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <CardTitle className="text-[10px] sm:text-[12.5px] font-extrabold text-slate-500 tracking-wider uppercase leading-tight">
                  Valor Patrimonio Enseres
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-[12px] text-slate-500 font-semibold">
                  Enseres inventariados
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-0 pb-3 sm:pb-5 px-3 sm:px-6">
              {loading ? (
                <Skeleton className="h-7 sm:h-10 w-32 sm:w-48 rounded-lg" />
              ) : (
                <div className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(stats?.valorEnseres || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actividad Reciente y Accesos Rápidos */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 relative z-10">
          {/* Actividad Reciente */}
          <Card className="border-slate-100/90 bg-white/85 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.02)] transition-all duration-300 hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)] hover:border-slate-200/80 overflow-hidden relative">
            <CardHeader className="relative z-10 pb-3 sm:pb-4 border-b border-slate-50 flex flex-row items-center gap-2.5 sm:gap-3 px-3 pt-3 sm:p-6">
              <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-lg font-black text-slate-800 tracking-tight leading-tight">
                  Actividad Reciente
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">
                  Últimas operaciones del sistema
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-3 sm:pt-5 px-3 sm:px-6 pb-3 sm:pb-6">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : actividad.length > 0 ? (
                <div className="relative pl-5 space-y-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  {actividad.map((item, index) => (
                    <div key={index} className="relative group/item flex items-start gap-3 transition-all">
                      <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 shadow-sm flex items-center justify-center transition-all duration-300 group-hover/item:scale-125 group-hover/item:bg-primary group-hover/item:border-primary/20 group-hover/item:shadow-[0_0_8px_rgba(59,130,246,0.4)]">
                        {index === 0 && (
                          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 bg-slate-50/50 hover:bg-white hover:border-slate-200/80 border border-slate-100/60 p-3 rounded-xl transition-all duration-300">
                        <p className="text-[13px] font-bold text-slate-700 leading-snug">{item.descripcion}</p>
                        <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-semibold text-slate-400 mt-1">
                          {item.detalle && <span className="text-slate-500 font-bold">{item.detalle}</span>}
                          {item.fecha && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{formatDate(item.fecha)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 font-semibold text-center py-6">No hay actividad reciente</p>
              )}
            </CardContent>
          </Card>

          {/* Accesos Rápidos */}
          <Card className="border-slate-100/90 bg-white/85 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.02)] transition-all duration-300 hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)] hover:border-slate-200/80 overflow-hidden relative">
            <CardHeader className="relative z-10 pb-3 sm:pb-4 border-b border-slate-50 flex flex-row items-center gap-2.5 sm:gap-3 px-3 pt-3 sm:p-6">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-lg font-black text-slate-800 tracking-tight leading-tight">
                  Accesos Rápidos
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">
                  Navegación directa a módulos
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-3 sm:pt-5 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid gap-2 sm:gap-3 grid-cols-2">
                {[
                  { to: "/bienes-muebles", icon: Package, label: "Bienes Muebles", sub: "Inventariados", color: "blue" },
                  { to: "/resguardos", icon: Shield, label: "Resguardos", sub: "Activos", color: "emerald" },
                  { to: "/revisiones/nueva", icon: ClipboardList, label: "Nueva Revisión", sub: "Iniciar control", color: "cyan" },
                  { to: "/reportes", icon: FileCheck, label: "Reportes", sub: "Exportar datos", color: "amber" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-${link.color}-500/30 hover:shadow-md hover:shadow-${link.color}-500/5 group transition-all duration-300`}
                  >
                    <div className={`p-1.5 sm:p-2.5 rounded-lg bg-${link.color}-50/60 text-${link.color}-600 border border-${link.color}-100 group-hover:bg-${link.color}-600 group-hover:text-white group-hover:border-${link.color}-600 transition-colors duration-300 flex items-center justify-center flex-shrink-0`}>
                      <link.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] sm:text-[13px] font-bold text-slate-700 leading-none truncate">{link.label}</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold mt-0.5 sm:mt-1">{link.sub}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-auto text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
