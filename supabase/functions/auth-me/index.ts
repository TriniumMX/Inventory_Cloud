import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

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

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Token no proporcionado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = Deno.env.get('JWT_SECRET')!;

    // Verificar JWT
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    let payload;
    try {
      payload = await verify(token, key);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos actualizados del usuario desde la base de datos
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: usuarioData, error: fetchError } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre, usuario, permisos')
      .eq('id_usuario', parseInt(payload.sub as string))
      .maybeSingle();

    if (fetchError || !usuarioData) {
      console.error("Error fetching user:", fetchError);
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Token verified for user:", usuarioData.usuario);

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
    console.error("Auth me error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
