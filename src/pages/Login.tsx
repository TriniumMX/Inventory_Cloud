import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  Loader2, 
  Lock, 
  Heart, 
  Eye, 
  EyeOff, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Cloud, 
  TrendingUp, 
  Package,
  Building2,
  Shield
} from "lucide-react";
import logo from "@/assets/logo.png";

interface LoginForm {
  usuario: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setIsLoading(true);

    try {
      await login(data.usuario, data.password);
      setShowSplash(true);
      
      const startTime = Date.now();
      const duration = 2500;
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(currentProgress);
        if (elapsed >= duration) {
          clearInterval(progressInterval);
          navigate("/");
        }
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      setIsLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row w-full bg-background overflow-hidden">
      {/* Branding Section (Top on Mobile, Left on Desktop) */}
      <div
        className="relative flex flex-col lg:w-1/2 w-full min-h-[35vh] lg:min-h-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1f4e 0%, #112461 50%, #0e1f52 100%)" }}
      >
        
        {/* Modern grid pattern background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

        {/* Decorative modern wave pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
            <path d="M0,400 Q300,200 600,400 T1200,400 L1200,800 L0,800 Z" fill="#ffffff" />
          </svg>
          <svg className="absolute top-0 right-0 w-3/4 h-3/4" viewBox="0 0 800 800" preserveAspectRatio="none">
            <circle cx="600" cy="200" r="400" fill="#ffffff" className="opacity-20" />
          </svg>
        </div>

        {/* Logo and branding */}
        <div
          className="relative z-10 flex flex-col items-center justify-center w-full flex-1 p-8 lg:p-12 lg:pr-24 pb-12 md:pb-16 lg:pb-12"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
        >
          <div className="bg-white rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] ring-4 lg:ring-8 ring-white/10 transition-transform duration-500 hover:scale-105 relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl lg:rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img src={logo} alt="Inventory Cloud" className="relative z-10 w-24 lg:w-52 h-auto object-contain" />
          </div>

          {/* Creative Interactive Logistics Network (Desktop only) */}
          <div className="hidden lg:flex items-center justify-center w-full max-w-sm h-56 mt-8 relative">
            {/* Outer Orbit */}
            <div className="absolute w-44 h-44 rounded-full border border-dashed border-white/20 animate-[spin_40s_linear_infinite]" />
            {/* Inner Orbit */}
            <div className="absolute w-28 h-28 rounded-full border border-dashed border-white/10 animate-[spin_20s_linear_infinite]" />
            {/* Tilted 3D Orbit (Planetary look) */}
            <div className="absolute w-48 h-24 rounded-full border border-dashed border-white/15 rotate-[30deg] animate-[spin_30s_linear_infinite]" />

            {/* Connecting Rays (SVG in background) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="50" y1="50" x2="20" y2="18" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1="50" y1="50" x2="80" y2="18" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1="50" y1="50" x2="50" y2="92" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" strokeDasharray="3 3" />
            </svg>

            {/* Pulsing Central Halo */}
            <div className="absolute w-20 h-20 rounded-full bg-white/5 border border-white/10 animate-ping opacity-30 pointer-events-none" />

            {/* Central Cloud Node */}
            <div className="relative z-10 p-3.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl text-white hover:scale-110 hover:bg-white/20 transition-all duration-300 flex flex-col items-center justify-center w-16 h-16">
              <Cloud className="w-5 h-5 text-blue-200 animate-pulse" />
              <span className="text-[7px] uppercase tracking-widest font-black text-blue-100/90 mt-0.5">
                Nube
              </span>
            </div>

            {/* Satellite 1: Bienes Muebles (Top Left) */}
            <div className="absolute top-2 left-6 flex flex-col items-center gap-1 group hover:scale-105 transition-transform duration-300">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-lg shadow-black/5">
                <Package className="w-4 h-4 text-indigo-300" />
              </div>
              <span className="text-[9px] font-bold text-white/80 tracking-wide bg-slate-950/20 px-2 py-0.5 rounded-full backdrop-blur-sm">Bienes Muebles</span>
            </div>

            {/* Satellite 2: Bienes Inmuebles (Top Right) */}
            <div className="absolute top-2 right-6 flex flex-col items-center gap-1 group hover:scale-105 transition-transform duration-300">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-lg shadow-black/5">
                <Building2 className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-[9px] font-bold text-white/80 tracking-wide bg-slate-950/20 px-2 py-0.5 rounded-full backdrop-blur-sm">Bienes Inmuebles</span>
            </div>

            {/* Satellite 3: Resguardos (Bottom Center) */}
            <div className="absolute -bottom-[48px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group hover:scale-105 transition-transform duration-300">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-lg shadow-black/5">
                <Shield className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-[9px] font-bold text-white/80 tracking-wide bg-slate-950/20 px-2 py-0.5 rounded-full backdrop-blur-sm">Resguardos</span>
            </div>
          </div>
          
          <div className="mt-16 flex flex-col items-center opacity-85 hidden lg:flex">
            <p className="text-xs font-semibold text-white/70">Powered by Trinium</p>
            <p className="text-[10px] italic text-white/50 mt-0.5">"Tecnología con corazón"</p>
          </div>
        </div>

        {/* Multi-Wave Divider (Right Edge for Desktop) */}
        <div className="hidden lg:block absolute top-0 right-0 h-full w-24 lg:w-32 xl:w-40 z-20 text-background pointer-events-none translate-x-px">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <path d="M 100 0 L 100 100 L 20 100 C 90 75, -20 60, 30 50 C 80 35, -10 20, 20 0 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Multi-Wave Divider (Bottom Edge for Mobile) */}
        <div className="block lg:hidden absolute bottom-0 left-0 w-full h-8 md:h-12 z-20 text-background pointer-events-none translate-y-px">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <path d="M 0 100 L 100 100 L 100 62 C 85 130, 65 0, 50 62 C 35 130, 15 0, 0 62 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Form Section (Bottom on Mobile, Right on Desktop) */}
      <div className="flex-1 flex flex-col justify-start lg:justify-center items-center p-6 md:p-8 relative min-h-full bg-background">
        
        {/* Dynamic & Alive Background Elements (Right Side) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Subtle grid pattern matching the left side, but very faint dark-slate dots */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          
          {/* Ambient Glowing Neon Shapes */}
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] animate-[pulse_8s_infinite_ease-in-out]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[80px] animate-[pulse_12s_infinite_ease-in-out]" />
          <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/3 blur-[90px] animate-[pulse_10s_infinite_ease-in-out]" />
          
          {/* Abstract background flowing line/wave SVG */}
          <svg className="absolute bottom-0 right-0 w-full h-1/3 text-slate-100/40 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 Q 25 70, 50 85 T 100 70 L 100 100 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="w-full max-w-md space-y-6 lg:space-y-8 z-10 py-4 lg:py-10">
          
          {/* Welcome Header */}
          <div className="text-center space-y-2 lg:space-y-3">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              Control Patrimonial
            </h2>
            <p className="text-slate-500 text-xs lg:text-sm font-medium">
              Gestión de Bienes, Enseres y Resguardos
            </p>
            <div className="flex justify-center pt-2">
              <Badge variant="outline" className="gap-1.5 bg-primary/5 text-primary border-primary/20 px-4 py-1.5 shadow-sm rounded-full font-bold">
                <ShieldCheck className="h-4 w-4" />
                Acceso Seguro
              </Badge>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="relative mt-6 lg:mt-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl blur-2xl opacity-50 pointer-events-none" />
            <div className="relative space-y-5 lg:space-y-6 bg-white/80 backdrop-blur-xl p-6 md:p-10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.08)] border border-white/50">
              
              <div className="space-y-2">
                <Label htmlFor="usuario" className="text-xs font-extrabold text-slate-500 uppercase tracking-wider ml-1">Usuario</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <Input
                    id="usuario"
                    placeholder="Ingresa tu usuario"
                    autoComplete="username"
                    className="pl-11 h-12 lg:h-13 py-3 rounded-xl bg-slate-50/40 hover:bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:shadow-md text-[15px] transition-all duration-300"
                    {...register("usuario", { 
                      required: "El usuario es requerido",
                      minLength: { value: 3, message: "Mínimo 3 caracteres" }
                    })}
                    disabled={isLoading}
                  />
                </div>
                {errors.usuario && (
                  <p className="text-xs text-red-500 font-semibold ml-2">{errors.usuario.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-extrabold text-slate-500 uppercase tracking-wider ml-1">Contraseña</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-11 pr-12 h-12 lg:h-13 py-3 rounded-xl bg-slate-50/40 hover:bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:shadow-md text-[15px] transition-all duration-300 font-medium"
                    {...register("password", { required: "La contraseña es requerida" })}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-primary/5 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 lg:h-5 lg:w-5" /> : <Eye className="h-4 w-4 lg:h-5 lg:w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 font-semibold ml-2">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-850 rounded-xl mt-4">
                  <AlertDescription className="text-sm font-semibold text-center">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="group w-full h-12 lg:h-13 py-3 mt-4 lg:mt-6 text-sm lg:text-base font-bold tracking-wide rounded-xl text-white shadow-xl hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative border-0"
                style={{ background: "linear-gradient(90deg, #0d1f4e 0%, #1a3a8f 100%)" }}
                disabled={isLoading}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                      AUTENTICANDO…
                    </>
                  ) : (
                    <>
                      INICIAR SESIÓN
                      <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>

          {/* Footer Popover Modernized */}
          <div className="pt-4 lg:pt-6 flex justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="opacity-50 hover:opacity-100 hover:scale-110 transition-all duration-300 focus:outline-none p-2 rounded-full hover:bg-slate-100/50">
                  <Heart size={18} className="text-blue-600 fill-blue-600" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 text-center rounded-2xl border-slate-100 shadow-2xl bg-white/95 backdrop-blur-md mb-2">
                <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  Creado con <Heart size={13} className="text-blue-600 fill-blue-600" /> por Trinium
                </p>
                <p className="text-xs italic text-slate-500 mt-1">"Tecnología con corazón"</p>
              </PopoverContent>
            </Popover>
          </div>

        </div>
      </div>

      {/* Splash Loader Overlay rendering on top of the blurred login page */}
      {showSplash && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/10 backdrop-blur-xl animate-in fade-in duration-300">
          <style>{`
            @keyframes gentle-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            @keyframes shimmer-glow {
              0%, 100% { opacity: 0.9; filter: drop-shadow(0 4px 12px rgba(59, 130, 246, 0.08)); }
              50% { opacity: 1; filter: drop-shadow(0 8px 24px rgba(59, 130, 246, 0.22)); }
            }
            .animate-gentle-float {
              animation: gentle-float 3s ease-in-out infinite;
            }
            .animate-shimmer-glow {
              animation: shimmer-glow 2s ease-in-out infinite;
            }
          `}</style>
          <div className="flex flex-col items-center gap-6 text-center z-10">
            {/* Central Logo in a glassmorphic container with custom premium float + glow animations */}
            <div className="p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg animate-gentle-float animate-shimmer-glow">
              <img src={logo} alt="Inventory Cloud Logo" className="w-28 lg:w-36 h-auto object-contain" />
            </div>
            
            <div className="space-y-3 flex flex-col items-center">
              {/* Status Text */}
              <p className="text-[13px] font-bold text-slate-700 tracking-wide">
                Iniciando sesión…
              </p>
              
              {/* Horizontal Loading Bar */}
              <div className="w-40 lg:w-48 h-1 bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-600 rounded-full transition-all duration-75 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

