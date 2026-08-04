import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: Array<{
    id: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }>;
  onClearFilters?: () => void;
}

export function FilterBar({ filters, onClearFilters }: FilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-semibold">Filtros:</span>
      </div>
      {filters.map((filter) => (
        <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 text-sm">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 px-3 text-xs"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
