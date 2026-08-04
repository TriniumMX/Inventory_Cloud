import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileHide?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Buscar...",
  pageSize = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredData = searchTerm
    ? data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (key === "acciones" || key === "select") return 0;

    let valA = a[key];
    let valB = b[key];

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    // Check if both are date strings (e.g., YYYY-MM-DD or ISO)
    const isDate = (val: any) => {
      if (typeof val !== "string") return false;
      return /^\d{4}-\d{2}-\d{2}/.test(val);
    };

    if (isDate(valA) && isDate(valB)) {
      const timeA = new Date(valA).getTime();
      const timeB = new Date(valB).getTime();
      return direction === "asc" ? timeA - timeB : timeB - timeA;
    }

    const numA = typeof valA === "number" ? valA : Number(valA);
    const numB = typeof valB === "number" ? valB : Number(valB);

    if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
      return direction === "asc" ? numA - numB : numB - numA;
    }

    const strA = String(valA).trim().toLowerCase();
    const strB = String(valB).trim().toLowerCase();

    return direction === "asc"
      ? strA.localeCompare(strB, "es", { numeric: true, sensitivity: "base" })
      : strB.localeCompare(strA, "es", { numeric: true, sensitivity: "base" });
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {searchable && (
         <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Listado en tarjetas — solo en pantallas angostas (móvil) */}
      <div className="sm:hidden space-y-3">
        {paginatedData.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
            No se encontraron resultados
          </div>
        ) : (
          paginatedData.map((item, index) => {
            const selectColumn = columns.find((c) => c.key === "select");
            const accionesColumn = columns.find((c) => c.key === "acciones");
            const fieldColumns = columns.filter((c) => c.key !== "select" && c.key !== "acciones");
            const [titleColumn, ...restColumns] = fieldColumns;

            return (
              <div
                key={index}
                className={cn(
                  "relative rounded-xl border border-border bg-card shadow-sm p-4 space-y-2.5 transition-colors",
                  onRowClick && "cursor-pointer active:bg-muted/40"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {selectColumn && (
                  <div
                    className="absolute top-3 right-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectColumn.render ? selectColumn.render(item) : null}
                  </div>
                )}

                {titleColumn && (
                  <div className={selectColumn ? "pr-8" : undefined}>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-0.5">
                      {titleColumn.label}
                    </p>
                    <div className="text-sm font-semibold text-foreground">
                      {titleColumn.render ? titleColumn.render(item) : item[titleColumn.key]}
                    </div>
                  </div>
                )}

                {restColumns.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    {restColumns.map((column) => (
                      <div key={column.key} className="flex items-start justify-between gap-3">
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/80 flex-shrink-0 pt-0.5">
                          {column.label}
                        </span>
                        <span className="text-xs text-foreground text-right min-w-0">
                          {column.render ? column.render(item) : (item[column.key] ?? "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {accionesColumn && (
                  <div
                    className="flex items-center justify-end gap-1 pt-2 border-t border-border/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {accionesColumn.render ? accionesColumn.render(item) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tabla — desde sm (tablet/desktop) */}
      <div className="hidden sm:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border bg-muted/30">
                {columns.map((column) => {
                  const isSortable = column.key !== "acciones" && column.key !== "select";
                  return (
                    <TableHead
                      key={column.key}
                      className={`text-[11px] font-extrabold tracking-wider uppercase text-muted-foreground whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3${column.mobileHide ? " hidden sm:table-cell" : ""}`}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors font-extrabold tracking-wider uppercase"
                        >
                          {column.label}
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    No se encontraron resultados
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow
                    key={index}
                    className={`border-b border-border/50 transition-colors ${
                      onRowClick
                        ? "cursor-pointer hover:bg-muted/40"
                        : "hover:bg-muted/20"
                    }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm${column.mobileHide ? " hidden sm:table-cell" : ""}`}
                      >
                        {column.render ? column.render(item) : item[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {startIndex + 1}–
            {Math.min(startIndex + pageSize, filteredData.length)} de{" "}
            {filteredData.length} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="text-xs text-muted-foreground px-1 min-w-[70px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
