import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Database, Users, Bell } from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";

export default function Configuracion() {
  const sections = [
    {
      title: "Configuración General",
      description: "Ajustes generales del sistema",
      icon: Settings,
    },
    {
      title: "Base de Datos",
      description: "Configuración de conexión a la API",
      icon: Database,
    },
    {
      title: "Usuarios y Permisos",
      description: "Gestión de usuarios y roles",
      icon: Users,
    },
    {
      title: "Notificaciones",
      description: "Configurar alertas y notificaciones",
      icon: Bell,
    },
  ];

  return (
    <ProtectedPage requiredModulo="configuracion">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Configuración" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
            <p className="text-muted-foreground">
              Administra los ajustes del sistema de inventarios
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <section.icon className="h-8 w-8 text-primary" />
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {section.title === "Base de Datos" && (
                      <>API URL: {import.meta.env.VITE_API_URL}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}
