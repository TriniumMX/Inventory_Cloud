import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Label50x25 } from "@/components/labels/Label50x25";
import { listActivos } from "@/lib/api";
import { Activo } from "@/lib/types";
import { Loader2 } from "lucide-react";
import logoFull from "@/assets/logo.png";

const EtiquetaIndividual = () => {
  const { inventoryCode } = useParams<{ inventoryCode: string }>();
  const [searchParams] = useSearchParams();
  const [activo, setActivo] = useState<Activo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Parse options from query params (can be passed from DetalleActivoDrawer)
  const descFromParams = searchParams.get("desc");
  const nsFromParams = searchParams.get("ns");

  useEffect(() => {
    const loadActivo = async () => {
      if (!inventoryCode) {
        setLoading(false);
        return;
      }

      // If we have description and serial from params, use them directly
      if (descFromParams || nsFromParams) {
        setActivo({
          id: "",
          numeroInventario: inventoryCode,
          descripcion: descFromParams || undefined,
          numeroSerie: nsFromParams || undefined,
        } as Activo);
        setLoading(false);
        return;
      }

      // Otherwise fetch from API
      try {
        const response = await listActivos({ search: inventoryCode, pageSize: 10 });
        const found = response.data.items.find(
          (a: Activo) => a.numeroInventario === inventoryCode
        );
        setActivo(found || null);
      } catch (error) {
        console.error("Error loading activo:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActivo();
  }, [inventoryCode, descFromParams, nsFromParams]);

  if (!inventoryCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Código de inventario no especificado</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando datos del activo...</p>
      </div>
    );
  }

  const orgName = import.meta.env.VITE_ORG_NAME || "INVENTORY CLOUD";
  const logoUrl = import.meta.env.VITE_LABEL_LOGO_URL || logoFull;
  const labelUrlBase = import.meta.env.VITE_LABEL_URL_BASE || window.location.origin;
  const isDemo = !import.meta.env.VITE_LABEL_URL_BASE || labelUrlBase.includes("localhost");

  return (
    <Label50x25
      inventoryCode={inventoryCode}
      orgName={orgName}
      logoUrl={logoUrl}
      descripcion={activo?.descripcion}
      numeroSerie={activo?.numeroSerie}
      dpi={203}
      showQr={true}
      showBarcodeText={true}
      isDemo={isDemo}
    />
  );
};

export default EtiquetaIndividual;
