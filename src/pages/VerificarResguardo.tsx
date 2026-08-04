import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, ArrowLeft, Building2 } from "lucide-react";
import { listResguardos, listConsignas } from "@/lib/api";
import { Resguardo, Consigna } from "@/lib/types";
import { mapSqlToResguardoRow, groupRowsToResguardo, resolveResguardoDestino } from "@/lib/mappers";
import { useNavigate } from "react-router-dom";

export default function VerificarResguardo() {
  const { folio } = useParams<{ folio: string }>();
  const navigate = useNavigate();
  const [resguardo, setResguardo] = useState<Resguardo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [consignas, setConsignas] = useState<Consigna[]>([]);

  useEffect(() => {
    if (!folio) return;

    const loadResguardo = async () => {
      try {
        // Cargar consignas
        const consignasResponse = await listConsignas();
        setConsignas(consignasResponse.data.items);

        const response = await listResguardos(folio);
        const rows = response.data.items.map(mapSqlToResguardoRow);
        
        if (rows.length === 0) {
          setError(true);
          return;
        }

        const grouped = groupRowsToResguardo(rows);
        setResguardo(grouped);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadResguardo();
  }, [folio]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (error || !resguardo) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Resguardos", href: "/resguardos" }, { label: "Verificar" }]} />
        <main className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle>Resguardo no encontrado</CardTitle>
                  <CardDescription>El folio {folio} no existe en el sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/resguardos")} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Resguardos
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[{ label: "Resguardos", href: "/resguardos" }, { label: "Verificar" }]} />
      <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Verificar Resguardo</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Detalle y estado del resguardo</p>
          </div>
          <Button onClick={() => navigate("/resguardos")} variant="outline" className="self-start sm:self-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {resguardo.estatus === 1 ? (
                  <CheckCircle className="h-8 w-8 text-secondary" />
                ) : (
                  <XCircle className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <CardTitle>Estado del Resguardo</CardTitle>
                  <CardDescription>Folio: {resguardo.folio}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Estado</div>
                <Badge
                  variant={resguardo.estatus === 1 ? "default" : "secondary"}
                  className={
                    resguardo.estatus === 1
                      ? "bg-secondary/10 text-secondary"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {resguardo.estatus === 1 ? "Asignado" : "Devuelto"}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Destino</div>
                <div className="font-medium flex items-center gap-2">
                  {resolveResguardoDestino(resguardo.nomina, undefined, consignas).kind === "Institucion" && (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  {resolveResguardoDestino(resguardo.nomina, undefined, consignas).display}
                </div>
                <div className="text-sm text-muted-foreground">
                  {resolveResguardoDestino(resguardo.nomina, undefined, consignas).kind === "Institucion" 
                    ? "Institución en Comodato" 
                    : "Empleado"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Fecha de Asignación</div>
                <div className="font-medium">
                  {new Date(resguardo.fechaAsignacion).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {resguardo.fechaDevolucion && (
                <div>
                  <div className="text-sm text-muted-foreground">Fecha de Devolución</div>
                  <div className="font-medium">
                    {new Date(resguardo.fechaDevolucion).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artículos Asignados</CardTitle>
              <CardDescription>
                {resguardo.totalArticulos} artículo{resguardo.totalArticulos !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {resguardo.items.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-md">
                    <div className="font-medium">{item.numeroInventario}</div>
                    {item.descripcion && (
                      <div className="text-sm text-muted-foreground">{item.descripcion}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
