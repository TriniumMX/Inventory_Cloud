# Guía de despliegue en producción

**Repositorio:** https://github.com/TriniumMX/Inventory_Cloud.git

## Convención de commits y atribución

> Fuente de verdad para CÓMO se firman los commits y CÓMO se refleja la autoría real
> en Linear. Aplica a **toda persona o IA** que trabaje en este repo.

### Autor de commit (siempre el mismo)

Todo commit se firma con la cuenta compartida del equipo, **nunca** con la cuenta
personal de quien lo sube:

- Nombre: `Trinium MX`
- Email: `triniummx@gmail.com`

### Coautor (quién hizo el trabajo realmente)

Cada commit lleva uno o más *trailers* `Co-authored-by`, identificando a la persona
que hizo el trabajo **más** la IA usada. Personas del equipo:

| Persona | Email |
|---|---|
| Carlos Adrian | catr2777@gmail.com |
| Israel Basurto | oesedseven@gmail.com |
| Javier López | jl728122@gmail.com |

### Regla para la IA antes de commitear

Si no es evidente por el contexto de la sesión (email del usuario del sistema,
o algo que ya dijo explícitamente en la conversación) **quién** está al mando,
la IA **debe preguntar** algo como: *"¿Eres Isra, Carlos o Javier?"* antes de
crear el commit. Nunca se omite el coautor ni se asume sin confirmar.

### Formato de commit

```bash
git commit --author="Trinium MX <triniummx@gmail.com>" -m "$(cat <<'EOF'
<tipo>: <resumen breve>

Co-authored-by: <Nombre Persona> <email-persona>
Co-authored-by: <Nombre IA> <email-o-noreply-de-la-ia>
EOF
)"
```

- `--author` fija el autor visible del commit (Trinium MX) sin tocar `git config`
  global/local de la máquina (cada quien conserva su propia identidad de git para
  otros repos).
- Puede haber más de un `Co-authored-by` humano si dos personas trabajaron la
  misma tarea.

### Push obligatorio

Un commit no se considera terminado hasta que se sube al remoto (`git push`).
Commitear y dejar el trabajo solo en local **no cumple** esta convención — el
equipo (y Linear) necesitan verlo reflejado en GitHub. La IA debe hacer `git push`
después de cada commit (o tanda de commits) de una tarea, salvo que el usuario
pida explícitamente no subirlo todavía.

### Configurar el remoto (primera vez en una máquina nueva)

```cmd
git remote add origin https://github.com/TriniumMX/Inventory_Cloud.git
git push -u origin main
```

---

## Cómo bajar cambios al servidor

Cada vez que hagas `git push` desde tu máquina local, sigue estos pasos en el servidor de producción para aplicar los cambios correctamente.

---

### 1. Conectarse al servidor
Accede al servidor via RDP o sesión remota como siempre.

---

### 2. Ir al directorio del proyecto
```cmd
cd C:\inetpub\wwwroot\inventory
```

---

### 3. Bajar los cambios
```cmd
git pull origin main
```

---

### 4. Instalar dependencias (solo si cambiaron `package.json`)
```cmd
cd server
pnpm install
cd ..
```

---

### 5. Compilar el proyecto
**Este paso es obligatorio cada vez que haya cambios en el código.**
```cmd
pnpm run build
```

---

### 6. Reiniciar el servidor
```cmd
pm2 restart inventory-api
```

Verifica que quedó corriendo:
```cmd
pm2 status
```

---

### Secuencia rápida (copiar y pegar)
```cmd
cd C:\inetpub\wwwroot\inventory
git pull origin main
pnpm run build
pm2 restart inventory-api
pm2 status
```

---

## Notas importantes

- **No ejecutar** los scripts de `server/migration/` en producción a menos que se indique explícitamente. Son de uso único y ya se corrieron.
- El archivo `server/ecosystem.config.cjs` es local de cada entorno y **no se sincroniza con git**. Si alguna vez se borra accidentalmente del servidor, recrearlo con los valores de producción (`inventory`, puerto 5199).
- Los respaldos en `server/backups/` son locales y no están en el repo.
