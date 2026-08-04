import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { changePassword } from "@/lib/apiAuth";
import { Lock, Eye, EyeOff, KeyRound, Loader2, Key, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CambiarPassword() {
  const { toast } = useToast();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = passwordNueva && confirmarPassword && passwordNueva === confirmarPassword;
  const passwordsMismatch = passwordNueva && confirmarPassword && passwordNueva !== confirmarPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      toast({
        title: "Campos incompletos",
        description: "Por favor, completa todos los campos del formulario.",
        variant: "destructive",
      });
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      toast({
        title: "Contraseñas no coinciden",
        description: "La nueva contraseña y su confirmación deben ser idénticas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await changePassword(passwordActual, passwordNueva);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha cambiado exitosamente.",
      });
      // Limpiar formulario
      setPasswordActual("");
      setPasswordNueva("");
      setConfirmarPassword("");
    } catch (error: any) {
      toast({
        title: "Error al cambiar contraseña",
        description: error.message || "Ocurrió un error al procesar tu solicitud.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-0" />

        {/* Ambient glow effect in background */}
        <div className="absolute top-[-50px] right-0 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-br from-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

        <Header breadcrumbs={[{ label: "Cambiar Contraseña" }]} />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center relative z-10">
          <div className="w-full max-w-2xl flex flex-col gap-6 sm:gap-8 mx-auto">
            
            {/* Centered Header Section */}
            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center">
                <Key className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                  Configuración de <span className="text-primary">Seguridad</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-1">
                  Gestión y actualización de tu contraseña de acceso
                </p>
              </div>
            </div>

            {/* Centered Premium Card */}
            <Card className="group hover:shadow-[0_15px_45px_rgba(37,99,235,0.06)] dark:hover:shadow-none hover:border-slate-200/80 transition-all duration-300 border-slate-100 dark:border-slate-800 border-t-4 border-t-primary bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-[0_8px_30px_rgba(15,23,42,0.02)]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0" />
              
              <CardHeader className="relative z-10 pb-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-row items-center gap-3.5 px-4 pt-4 sm:p-6">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-all duration-300 shadow-sm flex items-center justify-center flex-shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="space-y-0.5 text-left">
                  <CardTitle className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    Actualizar Credenciales
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Modifica tu clave de acceso de manera confidencial
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    
                    {/* Contraseña Actual */}
                    <div className="space-y-2 md:col-span-2 text-left">
                      <Label htmlFor="passwordActual" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Contraseña Actual
                      </Label>
                      <div className="relative group/input">
                        <Input
                          id="passwordActual"
                          type={showActual ? "text" : "password"}
                          value={passwordActual}
                          onChange={(e) => setPasswordActual(e.target.value)}
                          placeholder="Ingresa tu contraseña actual"
                          className="pr-10 h-11 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all duration-200"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowActual(!showActual)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title={showActual ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Nueva Contraseña */}
                    <div className="space-y-2 text-left">
                      <Label htmlFor="passwordNueva" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Nueva Contraseña
                      </Label>
                      <div className="relative group/input">
                        <Input
                          id="passwordNueva"
                          type={showNueva ? "text" : "password"}
                          value={passwordNueva}
                          onChange={(e) => setPasswordNueva(e.target.value)}
                          placeholder="Crea tu nueva contraseña"
                          className={cn(
                            "pr-10 h-11 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all duration-200",
                            passwordsMatch && "border-emerald-400 dark:border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                          )}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNueva(!showNueva)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title={showNueva ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Nueva Contraseña */}
                    <div className="space-y-2 text-left">
                      <Label htmlFor="confirmarPassword" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Confirmar Nueva Contraseña
                      </Label>
                      <div className="relative group/input">
                        <Input
                          id="confirmarPassword"
                          type={showConfirmar ? "text" : "password"}
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          placeholder="Reingresa la nueva contraseña"
                          className={cn(
                            "pr-10 h-11 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all duration-200",
                            passwordsMatch && "border-emerald-400 dark:border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20",
                            passwordsMismatch && "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                          )}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmar(!showConfirmar)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title={showConfirmar ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Warnings & Match indicators */}
                    {passwordsMatch && (
                      <div className="md:col-span-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-2.5 rounded-xl animate-fade-in text-left">
                        <Check className="h-4 w-4 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-bold">Las contraseñas coinciden perfectamente</span>
                      </div>
                    )}

                    {passwordsMismatch && (
                      <div className="md:col-span-2 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 p-2.5 rounded-xl animate-fade-in">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                        <span className="text-[11px] sm:text-xs font-bold">Las contraseñas ingresadas no coinciden</span>
                      </div>
                    )}
                  </div>

                  {/* Actions wrapper */}
                  <div className="pt-4 flex justify-end border-t border-slate-100/60 dark:border-slate-800/50">
                    <Button
                      type="submit"
                      className="w-full sm:w-auto h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                      disabled={loading || !passwordActual || !passwordNueva || passwordNueva !== confirmarPassword}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando Cambios...
                        </>
                      ) : (
                        "Actualizar Contraseña"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}
