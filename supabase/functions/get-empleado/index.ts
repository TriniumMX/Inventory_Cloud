const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const nomina = url.searchParams.get('nomina');

    if (!nomina) {
      return new Response(
        JSON.stringify({ error: 'Parámetro nomina requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Buscando empleado con nómina: ${nomina}`);

    // Construir envelope SOAP para el servicio WCF
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:tem="http://tempuri.org/" 
                  xmlns:wcf="http://schemas.datacontract.org/2004/07/WcfServiceEmp">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:GetEmpleado>
         <tem:emp>
            <wcf:num_nom>${nomina}</wcf:num_nom>
         </tem:emp>
      </tem:GetEmpleado>
   </soapenv:Body>
</soapenv:Envelope>`;

    console.log('Enviando request SOAP...');

    // Llamar al servicio WCF
    const response = await fetch(
      'http://sanjuandelrio.sytes.net:8082/ServiceEmp/ServiceEmp.svc',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://tempuri.org/IEmpleado/GetEmpleado',
        },
        body: soapEnvelope,
      }
    );

    if (!response.ok) {
      console.error(`SOAP error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error body:', errorBody);
      return new Response(
        JSON.stringify({ error: 'Error al consultar el servicio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xmlText = await response.text();
    console.log('Respuesta SOAP:', xmlText);

    // Parsear campos del XML de respuesta usando regex
    const extractField = (xml: string, field: string): string | null => {
      const regex = new RegExp(`<[^:]*:${field}>([^<]*)<\/[^:]*:${field}>`);
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    const numNom = extractField(xmlText, 'num_nom');
    const nombre = extractField(xmlText, 'nombre');
    const aPaterno = extractField(xmlText, 'a_paterno');
    const aMaterno = extractField(xmlText, 'a_materno');
    const departamento = extractField(xmlText, 'departamento');
    const puesto = extractField(xmlText, 'puesto');
    const activo = extractField(xmlText, 'activo'); // "A" = Activo, "B" = Baja

    // Verificar si se encontró el empleado
    if (!numNom && !nombre) {
      console.log('Empleado no encontrado en la respuesta SOAP');
      return new Response(
        JSON.stringify({ error: 'Empleado no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir objeto de respuesta
    const empleado = {
      nomina: numNom || nomina,
      nombre: [nombre, aPaterno, aMaterno].filter(Boolean).join(' ').trim(),
      departamento: departamento || null,
      puesto: puesto || null,
      activo: activo || 'A', // Por defecto activo si no viene el campo
    };

    console.log('Empleado encontrado:', empleado);

    return new Response(
      JSON.stringify(empleado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en get-empleado:', error);
    return new Response(
      JSON.stringify({ error: 'Error al consultar el servicio de empleados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
