
# Cómo subir una actualización normal

## 1. En la laptop

```bash
# Si cambiaste código del servidor (backend TypeScript):
cd server && pnpm run build
cd ..

# Si cambiaste código del frontend (React):
pnpm run build

# Siempre al final:
git add .
git commit -m "descripcion del cambio"
git push empresa main
```

> Si solo cambiaste backend: solo `cd server && pnpm run build`
> Si solo cambiaste frontend: solo `pnpm run build` en la raíz
> Si cambiaste ambos: haz los dos builds

## 2. En el servidor (Windows Server)

```bash
cd C:\inetpub\wwwroot\inventory_cloud
git pull empresa main

cd server
pm2 restart ecosystem.config.cjs --update-env
```

> Si solo cambiaste frontend no necesitas reiniciar PM2 — con el `git pull` es suficiente.

---

# Cómo cambiar el puerto

## 1. En la laptop

- `server/ecosystem.config.cjs` → CORS_ORIGIN cambia `:PUERTO_VIEJO` a `:PUERTO_NUEVO`
- `.env.production` → VITE_LABEL_URL_BASE cambia `:PUERTO_VIEJO` a `:PUERTO_NUEVO`

```bash
pnpm run build
git add .
git commit -m "chore: cambiar puerto a PUERTO_NUEVO"
git push empresa main
```

## 2. En el servidor (Windows Server)

```bash
cd C:\inetpub\wwwroot\inventory_cloud
git pull empresa main
```

- IIS Manager → `inventory_cloud` → **Bindings** → elimina binding del puerto viejo → agrega nuevo en `PUERTO_NUEVO` con el mismo certificado SSL

```bash
cd C:\inetpub\wwwroot\inventory_cloud\server
pm2 restart ecosystem.config.cjs --update-env
iisreset
```
