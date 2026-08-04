import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  UserX,
  AlertTriangle,
  Loader2,
  Package,
  Briefcase,
  ArrowLeftRight,
  RefreshCw,
  ArrowRight,
  Users,
  Eye,
} from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { CambiarEstatusModal } from "@/components/modals/CambiarEstatusModal";
import { ReasignarBienModal } from "@/components/modals/ReasignarBienModal";
import { TraspasoMasivoModal } from "@/components/modals/TraspasoMasivoModal";
import { listActivosByUltimoNomina } from "@/lib/api";
import { mapSqlToActivo } from "@/lib/mappers";
import { Activo } from "@/lib/types";
import { getEmpleadosBaja, EmpleadoBajaItem } from "@/lib/employees";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ESTATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVO:    { label: "Activo",       className: "bg-green-100 text-green-800 hover:bg-green-100" },
  ALMACEN:   { label: "En Almacén",   className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  "PRE-BAJA":{ label: "Pre-Baja",     className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  BAJA:      { label: "Baja",         className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

export default function EmpleadosBaja() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const puedeEditar = canEdit("empleados-baja");

  // Employee list
  const [empleados, setEmpleados] = useState<EmpleadoBajaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected employee & their assets
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoBajaItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);

  // Modals
  const [cambiarEstatusActivo, setCambiarEstatusActivo] = useState<Activo | null>(null);
  const [reasignarActivo, setReasignarActivo] = useState<Activo | null>(null);
  const [traspasoOpen, setTraspasoOpen] = useState(false);

  const loadEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getEmpleadosBaja();
      setEmpleados(items);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados dados de baja",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadActivos = useCallback(
    async (nomina: string) => {
      setLoadingActivos(true);
      try {
        const res = await listActivosByUltimoNomina(nomina);
        setActivos(res.data.items.map(mapSqlToActivo));
      } catch {
        toast({
          title: "Error",
          description: "No se pudieron cargar los bienes del empleado",
          variant: "destructive",
        });
      } finally {
        setLoadingActivos(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadEmpleados();
  }, [loadEmpleados]);

  const handleVerBienes = (empleado: EmpleadoBajaItem) => {
    setSelectedEmpleado(empleado);
    setSheetOpen(true);
    loadActivos(empleado.nomina);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedEmpleado(null);
      setActivos([]);
    }
  };

  const handleAfterAssetAction = useCallback(() => {
    if (selectedEmpleado) loadActivos(selectedEmpleado.nomina);
    loadEmpleados();
  }, [selectedEmpleado, loadActivos, loadEmpleados]);

  const handleAfterTraspaso = useCallback(() => {
    setSheetOpen(false);
    setSelectedEmpleado(null);
    setActivos([]);
    loadEmpleados();
  }, [loadEmpleados]);

  const sinPermisoEdicion = () =>
    toast({ title: "Sin permiso", description: "No tienes permiso para realizar esta acción en este módulo.", variant: "destructive" });

  const handleAbrirReasignar = (item: Activo) => {
    if (!puedeEditar) { sinPermisoEdicion(); return; }
    setReasignarActivo(item);
  };

  const handleAbrirCambiarEstatus = (item: Activo) => {
    if (!puedeEditar) { sinPermisoEdicion(); return; }
    setCambiarEstatusActivo(item);
  };

  const handleAbrirTraspaso = () => {
    if (!puedeEditar) { sinPermisoEdicion(); return; }
    setTraspasoOpen(true);
  };

  // ── Columns: employee list ─────────────────────────────────────────────
  const empleadoColumns = [
    {
      key: "nomina",
      label: "Nómina",
      render: (item: EmpleadoBajaItem) => (
        <span className="font-mono font-semibold text-sm">{item.nomina}</span>
      ),
    },
    {
      key: "nombre",
      label: "Nombre",
      render: (item: EmpleadoBajaItem) => (
        <div>
          <p className="font-medium">{item.nombre}</p>
          {item.puesto && (
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{item.puesto}</p>
          )}
        </div>
      ),
    },
    {
      key: "departamento",
      label: "Departamento / Área",
      render: (item: EmpleadoBajaItem) =>
        item.departamento ? (
          <span className="text-sm">{item.departamento}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "estatus",
      label: "Estatus RH",
      render: () => (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 gap-1">
          <UserX className="h-3 w-3" />
          Baja
        </Badge>
      ),
    },
    {
      key: "totalBienes",
      label: "Bienes",
      render: (item: EmpleadoBajaItem) => (
        <Badge variant="outline" className="font-semibold text-sm border-orange-300 text-orange-700 bg-orange-50">
          {item.totalBienes} {item.totalBienes === 1 ? "bien" : "bienes"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: EmpleadoBajaItem) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-primary/30 hover:bg-primary/5"
          onClick={() => handleVerBienes(item)}
        >
          <Eye className="h-3.5 w-3.5" />
          Ver Bienes
        </Button>
      ),
    },
  ];

  // ── Columns: asset list inside Sheet ──────────────────────────────────
  const activoColumns = [
    {
      key: "numeroInventario",
      label: "Núm. Inventario",
      render: (item: Activo) => (
        <span className="font-mono font-semibold text-sm">{item.numeroInventario}</span>
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (item: Activo) => (
        <span className="block max-w-[200px] truncate text-sm" title={item.descripcion}>
          {item.descripcion}
        </span>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Activo) =>
        item.tipo === 1 ? (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs gap-1 border-0">
            <Package className="h-3 w-3" /> Mueble
          </Badge>
        ) : item.tipo === 2 ? (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs gap-1 border-0">
            <Briefcase className="h-3 w-3" /> Enser
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "estatus",
      label: "Estatus",
      render: (item: Activo) => {
        const cfg = ESTATUS_CONFIG[item.estatus];
        return (
          <Badge className={`text-xs border-0 ${cfg?.className ?? "bg-gray-100 text-gray-700"}`}>
            {cfg?.label ?? item.estatus}
          </Badge>
        );
      },
    },
    {
      key: "costo",
      label: "Costo",
      render: (item: Activo) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(item.costo),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Activo) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); handleAbrirReasignar(item); }}
          >
            <ArrowLeftRight className="h-3 w-3" />
            Reasignar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); handleAbrirCambiarEstatus(item); }}
          >
            <RefreshCw className="h-3 w-3" />
            Estatus
          </Button>
        </div>
      ),
    },
  ];

  const totalBienesAfectados = empleados.reduce((s, e) => s + e.totalBienes, 0);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <ProtectedPage requiredModulo="empleados-baja">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Empleados de Baja" }]} />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empleados de Baja</h1>
            <p className="text-muted-foreground">
              Empleados que el servicio de RH reporta como dados de baja y aún tienen bienes asignados.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Empleados con Bienes Pendientes"
              value={loading ? "…" : empleados.length}
              icon={UserX}
              description="Requieren atención"
            />
            <StatCard
              title="Total Bienes Afectados"
              value={loading ? "…" : totalBienesAfectados}
              icon={Package}
              description="Bienes sin resguardante activo"
            />
          </div>

          {!loading && empleados.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Acción requerida</AlertTitle>
              <AlertDescription className="text-orange-700">
                Los empleados listados han sido dados de baja en el sistema de RH pero aún tienen
                bienes bajo su resguardo. Usa <strong>Ver Bienes</strong> para reasignar, cambiar
                estatus o traspasar cada activo.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-lg border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                Consultando servicio de Recursos Humanos…
              </span>
            </div>
          ) : empleados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card rounded-lg border gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Todo en orden</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No hay empleados dados de baja con bienes pendientes de reasignación.
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              data={empleados}
              columns={empleadoColumns}
              searchPlaceholder="Buscar por nómina, nombre o departamento…"
            />
          )}
        </main>
      </div>

      {/* ── Sheet: bienes del empleado seleccionado ─────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl p-0 flex flex-col gap-0"
        >
          {selectedEmpleado && (
            <>
              {/* Sheet header */}
              <div className="px-6 py-5 border-b bg-card space-y-4 flex-shrink-0">
                <SheetHeader className="space-y-0">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <UserX className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold leading-tight truncate">
                        {selectedEmpleado.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 text-xs gap-1">
                          <UserX className="h-3 w-3" />
                          Dado de Baja
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          Nómina: {selectedEmpleado.nomina}
                        </span>
                      </div>
                    </div>
                  </SheetTitle>
                  <SheetDescription className="text-left pl-14">
                    {[selectedEmpleado.puesto, selectedEmpleado.departamento]
                      .filter(Boolean)
                      .join(" • ") || "Sin información de puesto/área"}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex items-center gap-3 pl-14 flex-wrap">
                  <Badge
                    variant="outline"
                    className="border-orange-300 text-orange-700 bg-orange-50 font-semibold"
                  >
                    {activos.length} {activos.length === 1 ? "bien asignado" : "bienes asignados"}
                  </Badge>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 ml-auto"
                    onClick={handleAbrirTraspaso}
                    disabled={activos.length === 0 || loadingActivos}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Traspasar Todo ({activos.length})
                  </Button>
                </div>
              </div>

              {/* Asset list */}
              <div className="flex-1 overflow-auto p-6">
                {loadingActivos ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Cargando bienes…</span>
                  </div>
                ) : activos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/25" />
                    <p className="text-muted-foreground text-sm">
                      Este empleado no tiene bienes activos asignados.
                    </p>
                  </div>
                ) : (
                  <DataTable
                    data={activos}
                    columns={activoColumns}
                    searchable={false}
                  />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modals (solo se montan si tiene permiso de edición) ─────────── */}
      {puedeEditar && (
        <>
          <CambiarEstatusModal
            open={!!cambiarEstatusActivo}
            onOpenChange={(open) => { if (!open) setCambiarEstatusActivo(null); }}
            activo={cambiarEstatusActivo}
            onSuccess={() => {
              setCambiarEstatusActivo(null);
              handleAfterAssetAction();
            }}
          />

          <ReasignarBienModal
            open={!!reasignarActivo}
            onOpenChange={(open) => { if (!open) setReasignarActivo(null); }}
            bien={reasignarActivo}
            destinatarioActual={selectedEmpleado?.nomina ?? ""}
            onSuccess={() => {
              setReasignarActivo(null);
              handleAfterAssetAction();
            }}
          />

          <TraspasoMasivoModal
            open={traspasoOpen}
            onOpenChange={setTraspasoOpen}
            empleadoBaja={selectedEmpleado}
            bienesAsignados={activos}
            onSuccess={handleAfterTraspaso}
            onSoloConsultar={() => setTraspasoOpen(false)}
          />
        </>
      )}
    </ProtectedPage>
  );
}
