import { useMemo } from "react";
import { SearchableSelect, SearchableSelectOption } from "@/components/shared/SearchableSelect";
import { Clasificacion } from "@/lib/types";

interface ClasificacionComboboxProps {
  clasificaciones: Clasificacion[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Mostrar código junto al nombre en las opciones */
  showCode?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Opción "Todas" al inicio, para filtros */
  allOption?: boolean;
  allLabel?: string;
}

export function ClasificacionCombobox({
  clasificaciones,
  value,
  onValueChange,
  placeholder = "Selecciona clasificación…",
  showCode = false,
  className,
  triggerClassName,
  allOption = false,
  allLabel = "Todas",
}: ClasificacionComboboxProps) {
  const options: SearchableSelectOption[] = useMemo(
    () =>
      clasificaciones.map((c) => ({
        value: showCode ? c.id : c.codigo,
        label: c.nombre,
        sublabel: showCode ? c.codigo : undefined,
        keywords: c.codigo,
      })),
    [clasificaciones, showCode]
  );

  const normalizedValue = !value || value === "ALL" ? "" : value;

  return (
    <SearchableSelect
      options={options}
      value={normalizedValue}
      onValueChange={(v) => onValueChange(v || (allOption ? "ALL" : ""))}
      placeholder={allOption ? allLabel : placeholder}
      searchPlaceholder="Buscar clasificación…"
      emptyText="Sin resultados."
      className={className}
      triggerClassName={triggerClassName}
      clearable={allOption}
      clearLabel={allLabel}
    />
  );
}
