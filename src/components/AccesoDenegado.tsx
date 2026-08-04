import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface AccesoDenegadoProps {
  mensaje?: string;
}

export function AccesoDenegado({ mensaje }: AccesoDenegadoProps) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-0">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6 border border-red-200">
            <ShieldAlert className="h-14 w-14 text-red-500" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            {mensaje ?? "No tienes permiso para acceder a este módulo."}
          </p>
        </div>

        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 border">
          Contacta al administrador del sistema para solicitar acceso a este módulo.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Volver Atrás
          </Button>
          <Button onClick={() => navigate("/")}>
            Ir al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
