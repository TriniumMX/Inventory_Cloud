import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const ALLOWED_ORIGINS = (Deno.env.get('CORS_ORIGIN') || 'https://inventory-cloud-pi.vercel.app,http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map((o) => o.trim());

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Rate limiting contra fuerza bruta / credential stuffing. Se guarda en
// Postgres (no en memoria del proceso) porque las Edge Functions son
// serverless y no hay estado confiable entre invocaciones.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

async function checkRateLimit(supabase: ReturnType<typeof createClient>, identifier: string) {
  const { data } = await supabase
    .from('auth_login_attempts')
    .select('attempts, first_attempt_at, locked_until')
    .eq('identifier', identifier)
    .maybeSingle();

  if (data?.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
    return { blocked: true };
  }
  return { blocked: false, row: data };
}

async function recordFailedAttempt(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  row: { attempts: number; first_attempt_at: string } | null | undefined
) {
  const windowExpired = !row || Date.now() - new Date(row.first_attempt_at).getTime() > WINDOW_MS;
  const attempts = windowExpired ? 1 : row.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + WINDOW_MS).toISOString() : null;

  await supabase.from('auth_login_attempts').upsert({
    identifier,
    attempts,
    first_attempt_at: windowExpired ? new Date().toISOString() : row!.first_attempt_at,
    locked_until: lockedUntil,
  });
}

async function clearAttempts(supabase: ReturnType<typeof createClient>, identifier: string) {
  await supabase.from('auth_login_attempts').delete().eq('identifier', identifier);
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { usuario, password } = await req.json();

    if (!usuario || !password) {
      return new Response(
        JSON.stringify({ error: "Usuario y contraseña son requeridos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const identifier = String(usuario).toLowerCase().trim();
    const rateLimit = await checkRateLimit(supabase, identifier);
    if (rateLimit.blocked) {
      return new Response(
        JSON.stringify({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar usuario por nombre de usuario (case insensitive)
    const { data: usuarioData, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('usuario', usuario)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error al buscar usuario" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!usuarioData) {
      console.log("User not found:", usuario);
      await recordFailedAttempt(supabase, identifier, rateLimit.row);
      return new Response(
        JSON.stringify({ error: "Usuario o contraseña incorrectos" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let passwordValid = false;

    // Validar contraseña según tenga hash o texto plano
    // Usar versiones síncronas de bcrypt (las async usan Workers que no están disponibles en Deno)
    if (usuarioData.password_hash) {
      passwordValid = bcrypt.compareSync(password, usuarioData.password_hash);
    } else if (usuarioData.password) {
      // Comparación en texto plano (legacy)
      passwordValid = usuarioData.password === password;

      if (passwordValid) {
        // Migrar a hash automáticamente
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ password_hash: hash, password: null })
          .eq('id_usuario', usuarioData.id_usuario);

        if (updateError) {
          console.warn("Could not migrate password to hash:", updateError);
        } else {
          console.log("Password migrated to hash for user:", usuario);
        }
      }
    }

    if (!passwordValid) {
      console.log("Invalid password for user:", usuario);
      await recordFailedAttempt(supabase, identifier, rateLimit.row);
      return new Response(
        JSON.stringify({ error: "Usuario o contraseña incorrectos" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await clearAttempts(supabase, identifier);

    // Módulos permitidos (SuperAdmin no necesita filas, bypassea el check en el cliente)
    let modulosPermitidos: { clave: string; puedeEditar: boolean }[] = [];
    if (usuarioData.permisos !== 1) {
      const { data: modulosData, error: modulosError } = await supabase
        .from('usuario_modulos')
        .select('puede_editar, modulos(clave)')
        .eq('id_usuario', usuarioData.id_usuario)
        .eq('puede_ver', true);

      if (!modulosError && modulosData) {
        modulosPermitidos = (modulosData as any[])
          .filter((r) => r.modulos?.clave)
          .map((r) => ({ clave: r.modulos.clave, puedeEditar: !!r.puede_editar }));
      }
    }

    // Crear JWT
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: usuarioData.id_usuario.toString(),
        id: usuarioData.id_usuario,
        usuario: usuarioData.usuario,
        nombre: usuarioData.nombre,
        permisos: usuarioData.permisos,
        exp: getNumericDate(60 * 60 * 24 * 7), // 7 días
      },
      key
    );

    console.log("Login successful for user:", usuario);

    return new Response(
      JSON.stringify({
        id: usuarioData.id_usuario,
        nombre: usuarioData.nombre,
        usuario: usuarioData.usuario,
        permisos: usuarioData.permisos ?? 1,
        modulosPermitidos,
        token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
