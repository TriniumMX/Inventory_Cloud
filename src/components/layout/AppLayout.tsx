import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Index from "@/pages/Index";
import BienesMuebles from "@/pages/BienesMuebles";
import BienesInmuebles from "@/pages/BienesInmuebles";
import Enseres from "@/pages/Enseres";
import Resguardos from "@/pages/Resguardos";
import VerificarResguardo from "@/pages/VerificarResguardo";
import Revisiones from "@/pages/Revisiones";
import RevisionNueva from "@/pages/RevisionNueva";
import RevisionSesion from "@/pages/RevisionSesion";
import Reportes from "@/pages/Reportes";
import Configuracion from "@/pages/Configuracion";
import Usuarios from "@/pages/Usuarios";
import Empleados from "@/pages/Empleados";
import Instituciones from "@/pages/Instituciones";
import Styleguide from "@/pages/Styleguide";
import PreBaja from "@/pages/PreBaja";
import Almacen from "@/pages/Almacen";
import Auditoria from "@/pages/Auditoria";
import EmpleadosBaja from "@/pages/EmpleadosBaja";
import Permisos from "@/pages/Permisos";
import NotFound from "@/pages/NotFound";
import EtiquetaIndividual from "@/pages/EtiquetaIndividual";
import EtiquetaLote from "@/pages/EtiquetaLote";
import CambiarPassword from "@/pages/CambiarPassword";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bienes-muebles" element={<BienesMuebles />} />
            <Route path="/bienes-inmuebles" element={<BienesInmuebles />} />
            <Route path="/enseres" element={<Enseres />} />
            <Route path="/resguardos" element={<Resguardos />} />
            <Route path="/verificar/:folio" element={<VerificarResguardo />} />
            <Route path="/pre-baja" element={<PreBaja />} />
            <Route path="/almacen" element={<Almacen />} />
            <Route path="/empleados-baja" element={<EmpleadosBaja />} />
            <Route path="/revisiones" element={<Revisiones />} />
            <Route path="/revisiones/nueva" element={<RevisionNueva />} />
            <Route path="/revisiones/:sessionId" element={<RevisionSesion />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/instituciones" element={<Instituciones />} />
            <Route path="/auditoria" element={<Auditoria />} />
            <Route path="/permisos" element={<Permisos />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            <Route path="/styleguide" element={<Styleguide />} />
            <Route path="/etiquetas/:inventoryCode" element={<EtiquetaIndividual />} />
            <Route path="/etiquetas/lote" element={<EtiquetaLote />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </SidebarProvider>
  );
}
