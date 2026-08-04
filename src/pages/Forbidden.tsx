import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <>
      <Header breadcrumbs={[{ label: "Acceso Denegado" }]} />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes los permisos necesarios para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Volver Atrás
              </Button>
              <Button onClick={() => navigate("/")}>
                Ir al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
