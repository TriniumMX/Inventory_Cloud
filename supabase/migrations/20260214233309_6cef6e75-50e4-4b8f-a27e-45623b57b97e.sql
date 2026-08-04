
-- Secuencia para id_usuario automático
CREATE SEQUENCE IF NOT EXISTS usuarios_id_usuario_seq 
  OWNED BY usuarios.id_usuario;

SELECT setval('usuarios_id_usuario_seq', 
  COALESCE((SELECT MAX(id_usuario) FROM usuarios), 0));

ALTER TABLE usuarios 
  ALTER COLUMN id_usuario SET DEFAULT nextval('usuarios_id_usuario_seq');

-- Eliminar columna administrador
ALTER TABLE usuarios DROP COLUMN IF EXISTS administrador;
