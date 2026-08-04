import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value || value === "ALL") return null;
    const found = clasificaciones.find(
      (c) => c.codigo === value || c.id === value
    );
    if (!found) return null;
    return showCode ? `${found.codigo} — ${found.nombre}` : found.nombre;
  }, [value, clasificaciones, showCode]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedLabel ?? (allOption ? allLabel : placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", className)}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar clasificación…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {allOption && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onValueChange("ALL");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value || value === "ALL" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allLabel}
                </CommandItem>
              )}
              {clasificaciones.map((c) => {
                const itemValue = showCode ? c.id : c.codigo;
                const label = showCode
                  ? `${c.codigo} — ${c.nombre}`
                  : c.nombre;
                const isSelected = value === c.codigo || value === c.id;
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.codigo} ${c.nombre}`}
                    onSelect={() => {
                      onValueChange(itemValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
