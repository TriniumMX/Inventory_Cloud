import { useEffect, useState } from "react";
import { Clasificacion, CuentaContable } from "@/lib/types";
import { listClasificaciones, listCuentasContables } from "@/lib/api";
import { mapSqlToClasificacion, mapSqlToCuentaContable } from "@/lib/mappers";

// Cache en memoria para la sesión
const catalogCache = {
  clasificaciones: null as Clasificacion[] | null,
  cuentasContables: null as CuentaContable[] | null,
  loading: {
    clasificaciones: false,
    cuentasContables: false,
  },
};

export function useCatalogCache() {
  const [clasificaciones, setClasificaciones] = useState<Clasificacion[]>(
    catalogCache.clasificaciones || []
  );
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>(
    catalogCache.cuentasContables || []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      setLoading(true);

      try {
        // Cargar clasificaciones si no están en cache
        if (!catalogCache.clasificaciones && !catalogCache.loading.clasificaciones) {
          catalogCache.loading.clasificaciones = true;
          const clasifResponse = await listClasificaciones();
          const clasifData = clasifResponse.data.items.map(mapSqlToClasificacion);
          catalogCache.clasificaciones = clasifData;
          setClasificaciones(clasifData);
          catalogCache.loading.clasificaciones = false;
        } else if (catalogCache.clasificaciones) {
          setClasificaciones(catalogCache.clasificaciones);
        }

        // Cargar cuentas contables si no están en cache
        if (!catalogCache.cuentasContables && !catalogCache.loading.cuentasContables) {
          catalogCache.loading.cuentasContables = true;
          const ctasResponse = await listCuentasContables();
          const ctasData = ctasResponse.data.items.map(mapSqlToCuentaContable);
          catalogCache.cuentasContables = ctasData;
          setCuentasContables(ctasData);
          catalogCache.loading.cuentasContables = false;
        } else if (catalogCache.cuentasContables) {
          setCuentasContables(catalogCache.cuentasContables);
        }
      } catch (error) {
        console.error("Error cargando catálogos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  return { clasificaciones, cuentasContables, loading };
}
