-- Crear FK de activos.clasificacion a clasificacion.id_clasificacion
ALTER TABLE activos 
ADD CONSTRAINT fk_activos_clasificacion 
FOREIGN KEY (clasificacion) REFERENCES clasificacion(id_clasificacion);

-- Crear FK de activos.id_cta_contable a ctas_contables.id_ctacontable
ALTER TABLE activos 
ADD CONSTRAINT fk_activos_cta_contable 
FOREIGN KEY (id_cta_contable) REFERENCES ctas_contables(id_ctacontable);