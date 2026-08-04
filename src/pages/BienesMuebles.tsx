import { Package } from "lucide-react";
import ActivosPage from "@/components/activos/ActivosPage";

export default function BienesMuebles() {
  return (
    <ActivosPage
      tipo={1}
      moduloClave="bienes-muebles"
      titulo="Bienes Muebles"
      subtitulo="Gestión y control de activos del patrimonio"
      icono={Package}
      breadcrumbLabel="Bienes Muebles"
      labelSingular="Activo"
      labelPlural="Activos"
      statDescription="Bienes registrados"
      valorDescription="Patrimonio inventariado"
      addButtonLabel="Agregar Activo"
    />
  );
}
