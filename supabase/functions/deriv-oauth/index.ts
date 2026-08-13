import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const params = new URLSearchParams();
    let client_id: string;
    let redirect_uri: string;

    if (body.grant_type === "refresh_token") {
      // Refresh token flow
      if (!body.refresh_token || !body.client_id) {
        return new Response(
          JSON.stringify({ error: "Missing refresh_token or client_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      params.set("grant_type", "refresh_token");
      params.set("refresh_token", body.refresh_token);
      params.set("client_id", body.client_id);
      client_id = body.client_id;
      redirect_uri = body.redirect_uri || "";
    } else {
      // Authorization code flow
      const { code, code_verifier } = body;
      client_id = body.client_id;
      redirect_uri = body.redirect_uri;

      if (!code || !code_verifier || !client_id || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      params.set("grant_type", "authorization_code");
      params.set("client_id", client_id);
      params.set("code", code);
      params.set("code_verifier", code_verifier);
      params.set("redirect_uri", redirect_uri);
    }

    const response = await fetch("https://auth.deriv.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return new Response(
        JSON.stringify({ error: data.error_description || data.error || "Token exchange failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
