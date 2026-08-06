import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ error: "Usuario o contraseña incorrectos" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
