import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { toast } from "@/hooks/use-toast";
import {
  createSession,
  canCreateNewSession,
  getAllSessions,
  syncSessionToSupabase,
  type ExpectedItem,
} from "@/lib/revisionStore";
import { buscarEmpleado, listConsignas, listActivosByUltimoNomina } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function RevisionNueva() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [searchMode, setSearchMode] = useState<"empleado" | "institucion">("empleado");
  const [nominaInput, setNominaInput] = useState("");
  const [consignas, setConsignas] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedConsigna, setSelectedConsigna] = useState("");
  const [loadingConsignas, setLoadingConsignas] = useState(false);

  useEffect(() => {
    if (user && !canCreateNewSession(user.id)) {
      toast({
        title: "Límite alcanzado",
        description: "Ya tienes 5 revisiones activas. Finaliza alguna primero.",
        variant: "destructive",
      });
      navigate("/revisiones");
    }
  }, []);

  useEffect(() => {
    if (searchMode === "institucion" && consignas.length === 0) {
      loadConsignas();
    }
  }, [searchMode]);

  const loadConsignas = async () => {
    setLoadingConsignas(true);
    try {
      const response = await listConsignas();
      setConsignas(response.data.items);
    } catch (error) {
      console.error("Error loading consignas:", error);
      toast({ title: "Error", description: "No se pudieron cargar las instituciones.", variant: "destructive" });
    } finally {
      setLoadingConsignas(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      let expected: ExpectedItem[] = [];
      let responsable = "";
      let responsableId: string | number = "";

      if (searchMode === "empleado") {
        if (!nominaInput.trim()) {
          toast({ title: "Error", description: "Ingresa una nómina válida.", variant: "destructive" });
          return;
        }
        const empResponse = await buscarEmpleado(nominaInput.trim());
        if (!empResponse.data) {
          toast({ title: "Empleado no encontrado", description: "No se encontró un empleado con esa nómina.", variant: "destructive" });
          return;
        }
        responsable = empResponse.data.nombre;
        responsableId = nominaInput.trim();
        const activosResponse = await listActivosByUltimoNomina(nominaInput.trim());
        expected = activosResponse.data.items.map((item: any) => ({
          inv: item.numeroInventario,
          descripcion: item.descripcion,
        }));
      } else {
        if (!selectedConsigna) {
          toast({ title: "Error", description: "Selecciona una institución.", variant: "destructive" });
          return;
        }
        const consigna = consignas.find((c) => c.nombre === selectedConsigna);
        if (!consigna) {
          toast({ title: "Error", description: "Institución no válida.", variant: "destructive" });
          return;
        }
        responsable = consigna.nombre;
        responsableId = consigna.id;
        const activosResponse = await listActivosByUltimoNomina(consigna.nombre);
        expected = activosResponse.data.items.map((item: any) => ({
          inv: item.numeroInventario,
          descripcion: item.descripcion,
        }));
      }

      if (expected.length === 0) {
        toast({ title: "Sin artículos", description: "Este responsable no tiene artículos vigentes asignados.", variant: "destructive" });
        return;
      }

      // Validar duplicado
      const existing = user ? getAllSessions(user.id) : getAllSessions();
      const dup = existing.find((s) => String(s.target.responsableId) === String(responsableId));
      if (dup) {
        toast({ title: "Ya existe", description: `Ya tienes una revisión activa para ${responsable}.`, variant: "destructive" });
        return;
      }

      const newSession = createSession(
        "responsable",
        {
          responsableId,
          responsableNombre: responsable,
          responsableTipo: searchMode === "empleado" ? "Empleado" : "Institucion",
        },
        expected,
        user?.id
      );

      if (!newSession) {
        toast({ title: "Error", description: "No se pudo crear la sesión.", variant: "destructive" });
        return;
      }

      toast({ title: "Sesión iniciada", description: `Se esperan ${expected.length} artículos de ${responsable}.` });

      if (user) {
        syncSessionToSupabase(newSession, user.id);
      }

      navigate(`/revisiones/${newSession.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "No se pudo cargar el responsable.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage requiredRole={3}>
      <div className="flex-1 flex flex-col">
        <Header
          breadcrumbs={[
            { label: "Revisiones", href: "/revisiones" },
            { label: "Nueva Revisión" },
          ]}
        />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Selecciona el responsable</CardTitle>
                <CardDescription>Busca por empleado o institución</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Tipo de responsable</Label>
                  <RadioGroup
                    value={searchMode}
                    onValueChange={(v) => {
                      setSearchMode(v as "empleado" | "institucion");
                      setSelectedConsigna("");
                      setNominaInput("");
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="empleado" id="empleado" />
                      <Label htmlFor="empleado" className="cursor-pointer font-normal">Empleado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="institucion" id="institucion" />
                      <Label htmlFor="institucion" className="cursor-pointer font-normal">Institución</Label>
                    </div>
                  </RadioGroup>
                </div>

                {searchMode === "empleado" && (
                  <div className="space-y-3">
                    <Label htmlFor="nomina-input">Nómina del Empleado</Label>
                    <div className="flex gap-2">
                      <Input
                        id="nomina-input"
                        placeholder="Ej: EMP001"
                        value={nominaInput}
                        onChange={(e) => setNominaInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleStart()}
                      />
                      <Button onClick={handleStart} disabled={loading || !nominaInput.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                        {!loading && "Buscar"}
                      </Button>
                    </div>
                  </div>
                )}

                {searchMode === "institucion" && (
                  <div className="space-y-3">
                    <Label>Selecciona la institución</Label>
                    <div className="flex gap-2">
                      <SearchableSelect
                        options={consignas.map((c) => ({ value: c.nombre, label: c.nombre }))}
                        value={selectedConsigna}
                        onValueChange={setSelectedConsigna}
                        disabled={loadingConsignas}
                        placeholder={loadingConsignas ? "Cargando instituciones..." : "Seleccionar institución..."}
                        searchPlaceholder="Buscar institución…"
                        triggerClassName="flex-1"
                      />
                      <Button onClick={handleStart} disabled={loading || !selectedConsigna || loadingConsignas}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                        {!loading && "Buscar"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="outline" onClick={() => navigate("/revisiones")} className="w-full sm:w-auto">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}
