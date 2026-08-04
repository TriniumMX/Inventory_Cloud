import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [loadingText, setLoadingText] = useState("Verificando sesión...");

  useEffect(() => {
    if (loading) {
      const texts = [
        "Desencriptando credenciales...",
        "Cargando módulos del sistema...",
        "Preparando entorno de trabajo...",
        "Estableciendo conexión segura..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-900 animate-in fade-in duration-500">
        <div className="relative flex flex-col items-center">
          {/* Glowing background behind logo */}
          <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full scale-150 animate-pulse" />
          
          <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.3)] relative z-10 mb-6">
            <img src={logo} alt="Logo" className="w-20 h-20 object-contain animate-pulse" style={{ animationDuration: '2s' }} />
          </div>
          
          <h2 className="text-2xl font-extrabold text-white tracking-widest flex items-center gap-2 drop-shadow-md">
            INVENTORY <span className="text-blue-500">CLOUD</span>
          </h2>
          
          <div className="mt-8 flex flex-col items-center gap-4 bg-slate-800/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-slate-700/50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <p className="text-blue-200/80 text-sm font-semibold tracking-wide animate-pulse">{loadingText}</p>
          </div>
          
          <div className="absolute bottom-[-100px] flex items-center gap-2 text-emerald-400/90 bg-emerald-400/10 px-5 py-2 rounded-full border border-emerald-400/20 shadow-lg shadow-emerald-900/20 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4" /> Conexión Cifrada y Segura
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
