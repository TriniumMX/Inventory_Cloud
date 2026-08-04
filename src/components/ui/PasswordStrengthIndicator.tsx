import { evaluarSeguridadPassword } from "@/lib/apiAuth";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { nivel, mensaje } = evaluarSeguridadPassword(password);

  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-1">
        <div
          className={cn(
            "flex-1 rounded-full transition-colors",
            nivel === "debil" && "bg-destructive",
            nivel === "media" && "bg-yellow-500",
            nivel === "fuerte" && "bg-green-500"
          )}
        />
        <div
          className={cn(
            "flex-1 rounded-full transition-colors",
            nivel === "media" && "bg-yellow-500",
            nivel === "fuerte" && "bg-green-500",
            nivel !== "media" && nivel !== "fuerte" && "bg-muted"
          )}
        />
        <div
          className={cn(
            "flex-1 rounded-full transition-colors",
            nivel === "fuerte" && "bg-green-500",
            nivel !== "fuerte" && "bg-muted"
          )}
        />
      </div>
      <p
        className={cn(
          "text-xs font-medium transition-colors",
          nivel === "debil" && "text-destructive",
          nivel === "media" && "text-yellow-600",
          nivel === "fuerte" && "text-green-600"
        )}
      >
        Seguridad: {mensaje}
      </p>
    </div>
  );
}
