import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, FileText, Plus, Eye, Edit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProtectedPage } from "@/components/ProtectedPage";
import { SecureButton, useHasRole } from "@/components/SecureButton";
import { NuevoInmuebleModal } from "@/components/modals/NuevoInmuebleModal";
import { EditarInmuebleModal } from "@/components/modals/EditarInmuebleModal";
import { DetalleInmuebleDrawer } from "@/components/modals/DetalleInmuebleDrawer";
import {
  listBienesInmuebles,
  listTiposInmueble,
  listCuentasContables,
} from "@/lib/api";
import { getAllEmployees } from "@/lib/employees";
import { BienInmueble, TipoInmueble, CuentaContable, Empleado } from "@/lib/types";

export default function BienesInmuebles() {
  const [data, setData] = useState<BienInmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState<BienInmueble | null>(null);
  const [sinResguardante, setSinResguardante] = useState(false);

  // Catálogos
  const [tiposInmueble, setTiposInmueble] = useState<TipoInmueble[]>([]);
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  // Permisos
  const canEdit = useHasRole(2);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const inmuebles = await listBienesInmuebles();
      setData(inmuebles);
    } catch (error) {
      console.error("Error loading inmuebles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    try {
      const [tipos, cuentasRes, emps] = await Promise.all([
        listTiposInmueble(),
        listCuentasContables(),
        getAllEmployees(),
      ]);
      setTiposInmueble(tipos || []);
      setCuentasContables(cuentasRes.data?.items || []);
      setEmpleados(Array.isArray(emps) ? emps : []);
    } catch (error) {
      console.error("Error loading catalogs:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCatalogs();
  }, [loadData, loadCatalogs]);

  // Calcular estadísticas
  const totalSuperficie = data.reduce(
    (sum, i) => sum + (i.superficieConstruccion || 0),
    0
  );
  const totalEscrituras = data.filter((i) => i.numeroEscritura).length;

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-MX", { maximumFractionDigits: 2 });
  };

  const handleEditClick = (inmueble: BienInmueble) => {
    setSelectedInmueble(inmueble);
    setEditModalOpen(true);
  };

  const handleViewClick = (inmueble: BienInmueble) => {
    setSelectedInmueble(inmueble);
    setDetailDrawerOpen(true);
  };

  const columns = [
    { key: "numeroInventario", label: "No. Inventario" },
    { key: "direccion", label: "Dirección" },
    { key: "tipoNombre", label: "Tipo" },
    { key: "numeroEscritura", label: "Escritura" },
    {
      key: "superficieConstruccion",
      label: "Superficie (m²)",
      render: (row: BienInmueble) =>
        row.superficieConstruccion
          ? formatNumber(row.superficieConstruccion)
          : "-",
    },
    {
      key: "fechaRegistro",
      label: "Fecha de Alta",
      render: (row: BienInmueble) =>
        row.fechaRegistro
          ? new Date(row.fechaRegistro).toLocaleDateString("es-MX")
          : "—",
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (row: BienInmueble) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleViewClick(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEditClick(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <ProtectedPage requiredModulo="bienes-inmuebles">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Bienes Inmuebles" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Bienes Inmuebles
              </h1>
              <p className="text-muted-foreground">
                Registro y control del patrimonio inmobiliario
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Inmuebles"
              value={data.length}
              icon={Building2}
              description="Propiedades registradas"
            />
            <StatCard
              title="Superficie Total"
              value={`${formatNumber(totalSuperficie)} m²`}
              icon={MapPin}
              description="Área construida"
            />
            <StatCard
              title="Escrituras"
              value={totalEscrituras}
              icon={FileText}
              description="Documentos en orden"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch
                  id="sin-resguardante-inmuebles"
                  checked={sinResguardante}
                  onCheckedChange={setSinResguardante}
                />
                <Label htmlFor="sin-resguardante-inmuebles" className="text-sm cursor-pointer text-muted-foreground">
                  Solo sin responsable asignado
                </Label>
              </div>
              <SecureButton requiredModulo="bienes-inmuebles" onClick={() => setModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Inmueble
              </SecureButton>
            </div>

            <DataTable
              data={sinResguardante ? data.filter(i => !i.responsableNomina) : data}
              columns={columns}
              searchPlaceholder="Buscar por dirección, tipo o escritura..."
            />
          </div>
        </main>
      </div>

      <NuevoInmuebleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tiposInmueble={tiposInmueble}
        cuentasContables={cuentasContables}
        empleados={empleados}
        onSuccess={loadData}
      />

      <EditarInmuebleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        inmueble={selectedInmueble}
        tiposInmueble={tiposInmueble}
        cuentasContables={cuentasContables}
        empleados={empleados}
        onSuccess={loadData}
      />

      <DetalleInmuebleDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        inmueble={selectedInmueble}
        onRefresh={loadData}
      />
    </ProtectedPage>
  );
}