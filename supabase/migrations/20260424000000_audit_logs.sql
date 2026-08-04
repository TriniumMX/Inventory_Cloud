-- Tabla de auditoría para todas las acciones del sistema
CREATE TABLE audit_logs (
    id_log             BIGSERIAL PRIMARY KEY,
    tabla          VARCHAR(100)  NOT NULL,
    registro_id    VARCHAR(100)  NOT NULL,
    accion         VARCHAR(20)   NOT NULL,  -- CREATE | UPDATE | DELETE
    campo          VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo    TEXT,
    id_usuario     INT           NOT NULL,
    usuario        VARCHAR(100)  NOT NULL,
    nombre_usuario VARCHAR(255),
    ip_address     VARCHAR(50),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tabla_registro ON audit_logs(tabla, registro_id);
CREATE INDEX idx_audit_logs_created_at     ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_usuario        ON audit_logs(id_usuario);
