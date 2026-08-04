import { Briefcase } from "lucide-react";
import ActivosPage from "@/components/activos/ActivosPage";

export default function Enseres() {
  return (
    <ActivosPage
      tipo={2}
      moduloClave="enseres"
      titulo="Enseres"
      subtitulo="Control de equipamiento y enseres menores"
      icono={Briefcase}
      breadcrumbLabel="Enseres"
      labelSingular="Enser"
      labelPlural="Enseres"
      statDescription="Enseres registrados"
      valorDescription="Patrimonio en enseres"
      addButtonLabel="Agregar Enser"
    />
  );
}
