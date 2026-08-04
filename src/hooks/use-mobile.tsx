import * as React from "react";

// Usado por el sidebar para decidir cuándo mostrarse como overlay (Sheet) en vez de
// empujar el contenido. Se sube a 1024 para que tablets tengan el mismo comportamiento
// que móvil: el sidebar se abre encima del contenido y se cierra al navegar.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
