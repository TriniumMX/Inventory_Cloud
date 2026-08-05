import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Texto secundario mostrado en gris junto a la opción (no participa en el orden alfabético) */
  sublabel?: string;
  /** Texto adicional incluido en la búsqueda pero no mostrado */
  keywords?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** Opción para limpiar la selección (aparece al inicio de la lista) */
  clearable?: boolean;
  clearLabel?: string;
  /** Ordenar alfabéticamente por label. Default: true */
  sortAlphabetically?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona…",
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados.",
  className,
  triggerClassName,
  disabled,
  clearable = false,
  clearLabel = "Sin selección",
  sortAlphabetically = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sortedOptions = useMemo(() => {
    if (!sortAlphabetically) return options;
    return [...options].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );
  }, [options, sortAlphabetically]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedOptions;
    return sortedOptions.filter((o) =>
      `${o.label} ${o.sublabel ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(term)
    );
  }, [sortedOptions, search]);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function selectOption(v: string) {
    onValueChange(v);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[activeIndex];
      if (opt) selectOption(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", className)}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div
          ref={listRef}
          className="max-h-[280px] overflow-y-auto overscroll-contain p-1"
        >
          {clearable && (
            <SelectRow
              index={-1}
              active={false}
              selected={!value}
              label={clearLabel}
              onClick={() => selectOption("")}
              italic
            />
          )}
          {filteredOptions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
          {filteredOptions.map((opt, i) => (
            <SelectRow
              key={opt.value}
              index={i}
              active={i === activeIndex}
              selected={opt.value === value}
              label={opt.label}
              sublabel={opt.sublabel}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectOption(opt.value)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectRow({
  index,
  active,
  selected,
  label,
  sublabel,
  onClick,
  onMouseEnter,
  italic,
}: {
  index: number;
  active: boolean;
  selected: boolean;
  label: string;
  sublabel?: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  italic?: boolean;
}) {
  return (
    <div
      data-index={index}
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        active && "bg-accent text-accent-foreground",
        italic && "text-muted-foreground italic"
      )}
    >
      <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <span className="truncate">{label}</span>
      {sublabel && (
        <span className="ml-auto truncate text-xs text-muted-foreground">{sublabel}</span>
      )}
    </div>
  );
}
