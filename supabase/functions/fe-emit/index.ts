import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  sale_id: string;
  doc_type: string;
  client_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { sale_id, doc_type, client_id }: RequestPayload = await req.json();

    if (!sale_id || !doc_type) {
      throw new Error("Missing required fields: sale_id, doc_type");
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items(*)
      `)
      .eq("id", sale_id)
      .single();

    if (saleError || !sale) {
      throw new Error("Sale not found");
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", sale.company_id)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }

    const { data: feSettings } = await supabase
      .from("fe_company_settings")
      .select("*")
      .eq("company_id", sale.company_id)
      .maybeSingle();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toISOString().split("T")[1].split(".")[0].replace(/:/g, "");
    
    const docTypeCode = doc_type === "tiquete" ? "04" : doc_type === "factura" ? "01" : doc_type === "nc" ? "02" : "03";
    const situacion = "1";
    const securityCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    const clave = `506${dateStr}${timeStr}${securityCode}${docTypeCode}${situacion}`;

    const consecutivoPrefix = doc_type === "tiquete" ? "T" : doc_type === "factura" ? "F" : doc_type === "nc" ? "NC" : "ND";
    const { data: lastDoc } = await supabase
      .from("fe_documents")
      .select("consecutivo")
      .eq("company_id", sale.company_id)
      .eq("doc_type", doc_type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let consecutivoNum = 1;
    if (lastDoc?.consecutivo) {
      const match = lastDoc.consecutivo.match(/\d+/);
      if (match) {
        consecutivoNum = parseInt(match[0]) + 1;
      }
    }
    const consecutivo = `${consecutivoPrefix}-${consecutivoNum.toString().padStart(10, "0")}`;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>${clave}</Clave>
  <NumeroConsecutivo>${consecutivo}</NumeroConsecutivo>
  <FechaEmision>${now.toISOString()}</FechaEmision>
  <!-- TODO: Complete XML v4.4 structure -->
  <!-- TODO: Add company data, client data, line items, totals -->
</FacturaElectronica>`;

    const xmlFileName = `${clave}.xml`;
    const { error: uploadError } = await supabase.storage
      .from("fe-xml")
      .upload(`${sale.company_id}/${xmlFileName}`, xmlContent, {
        contentType: "application/xml",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload XML: ${uploadError.message}`);
    }

    const { data: { publicUrl: xmlUrl } } = supabase.storage
      .from("fe-xml")
      .getPublicUrl(`${sale.company_id}/${xmlFileName}`);

    const feEnv = Deno.env.get("FE_ENV") || "stag";
    const feCertP12 = Deno.env.get("FE_CERT_P12") || "EMPTY";

    let status = "pendiente";
    let haciendaTrackId = null;

    if (feEnv !== "prod" || feCertP12 === "EMPTY") {
      console.log(`FE_ENV="${feEnv}", FE_CERT_P12="${feCertP12 === "EMPTY" ? "EMPTY" : "SET"}": NO se firma ni se envía. Registrando como pendiente_local.`);
      status = "pendiente_local";
      haciendaTrackId = null;
    } else {
      console.log("Modo producción con certificado: se debe firmar y llamar a Hacienda (TODO)");
    }

    const { data: feDocument, error: feDocError } = await supabase
      .from("fe_documents")
      .insert({
        company_id: sale.company_id,
        sale_id: sale_id,
        client_id: client_id || null,
        doc_type: doc_type,
        clave: clave,
        consecutivo: consecutivo,
        status: status,
        hacienda_track_id: haciendaTrackId,
        xml_url: xmlUrl,
      })
      .select()
      .single();

    if (feDocError) {
      throw new Error(`Failed to create fe_document: ${feDocError.message}`);
    }

    if (sale.sale_items && Array.isArray(sale.sale_items)) {
      const lineInserts = sale.sale_items.map((item: any) => ({
        fe_document_id: feDocument.id,
        item_id: item.item_id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        cabys: null,
      }));

      await supabase
        .from("fe_document_lines")
        .insert(lineInserts);
    }

    console.log(`Documento FE creado: ${feDocument.id}, status: ${status}`);

    return new Response(
      JSON.stringify({
        fe_document_id: feDocument.id,
        status: status,
        clave: clave,
        consecutivo: consecutivo,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in fe-emit:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});