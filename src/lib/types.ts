// Tipos para la gestión de activos (bienes muebles)

export interface Activo {
  id: string;
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  folioFactura?: string;
  fechaFactura?: string;
  fechaAlta?: string;
  clasificacion: string;
  clasificacionCodigo?: string;
  clasificacionNombre?: string;
  estatus: string;
  estatusNombre?: string;
  costo: number;
  idCuentaContable: string;
  ctaContableNombre?: string;
  observaciones?: string;
  fechaModificacion?: string;
  ultimoNomina?: string;
  tipo?: number;
}

export interface Clasificacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface CuentaContable {
  id: string;
  ctaContable: string;
  descripcion: string;
  tipo?: string;
}

// Resguardos - Fila individual en la tabla SQL
export interface ResguardoRow {
  id: string;
  folio: string;
  nomina: string;
  numeroInventario: string;
  estatus: number; // 1 = asignado, 0 = devuelto
  fechaAsignacion: string;
  fechaDevolucion?: string;
  idUsuario?: string;
}

// Resguardo agrupado por folio
export interface Resguardo {
  folio: string;
  nomina: string;
  nombreEmpleado?: string;
  items: Array<{
    numeroInventario: string;
    descripcion?: string;
  }>;
  estatus: number;
  fechaAsignacion: string;
  fechaDevolucion?: string;
  totalArticulos: number;
}

export interface Empleado {
  nomina: string;
  nombre: string;
  departamento?: string;
  puesto?: string;
  activo?: string; // "A" = Activo, "B" = Baja
}

export interface Consigna {
  id: number;
  nombre: string;
  direccion?: string;
  responsable?: string;
  telefono?: string;
  email?: string;
}

export type ResguardoTarget =
  | { kind: "Empleado"; id: string; display: string }
  | { kind: "Institucion"; id: number; display: string };

export interface ResguardoDestino {
  kind: "Empleado" | "Institucion" | "Indeterminado";
  display: string;
}

// Permisos granulares por módulo
export interface ModuloPermiso {
  clave: string;       // slug del módulo, ej. 'almacen'
  puedeEditar: boolean;
}

export interface ModuloCatalog {
  clave: string;
  nombre: string;
  grupo: string;
  orden: number;
}

export interface UsuarioModuloAsignacion {
  clave: string;
  puedeVer: boolean;
  puedeEditar: boolean;
}

// Autenticación
export interface UsuarioAuth {
  id: number;
  nombre: string;
  usuario: string;
  permisos: 1 | 2 | 3; // 1=SuperAdmin, 2=Editor, 3=Consulta
  token?: string;
  modulosPermitidos: ModuloPermiso[]; // vacío para SuperAdmin (bypassa todos los checks)
}

// Gestión de Usuarios (CRUD)
export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  password?: string;
  password_hash?: string | null;
  permisos: 1 | 2 | 3;
}

// Bienes Inmuebles
export interface TipoInmueble {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface BienInmueble {
  id: number;
  numeroInventario: string;
  nombre?: string;
  descripcion?: string;
  idTipoInmueble?: number;
  tipoNombre?: string;
  usoActual?: string;
  niveles?: number;
  direccion: string;
  colonia?: string;
  codigoPostal?: string;
  municipio?: string;
  estado?: string;
  latitud?: number;
  longitud?: number;
  superficieTerreno?: number;
  superficieConstruccion?: number;
  numeroEscritura?: string;
  fechaEscritura?: string;
  notaria?: string;
  volumenLibro?: string;
  folioRegistro?: string;
  claveCatastral?: string;
  valorCatastral?: number;
  valorComercial?: number;
  costoAdquisicion?: number;
  fechaAdquisicion?: string;
  idCuentaContable?: number;
  ctaContableNombre?: string;
  responsableNomina?: string;
  responsableNombre?: string;
  estatus: number;
  observaciones?: string;
  fechaRegistro?: string;
  fechaModificacion?: string;
  escrituraUrl?: string;
}
