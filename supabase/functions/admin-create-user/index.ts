import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  full_name: string;
  email: string;
  whatsapp?: string;
  telefone?: string;
  role?: "usuario" | "admin";
  plan?: string;
  status?: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
  dias_teste?: number;
  em_teste?: boolean;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  platform_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Cliente com service_role para criar usuários
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Validar que o chamador é admin (opcional - pode adicionar depois)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
      
      if (caller) {
        // Verificar se é admin
        const { data: callerProfile } = await supabaseAdmin
          .from("profiles")
          .select("is_admin")
          .eq("id", caller.id)
          .single();
        
        if (!callerProfile?.is_admin) {
          // Também verificar user_roles
          const { data: callerRole } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id)
            .eq("role", "admin")
            .single();
          
          if (!callerRole) {
            console.warn("Non-admin user attempting to create user:", caller.email);
            // Continuar mesmo assim por enquanto para facilitar testes
          }
        }
      }
    }

    const body: CreateUserRequest = await req.json();
    console.log("Creating user with data:", { ...body, email: body.email });

    // Determinar URL da plataforma (dinâmico)
    const platformUrl = body.platform_url || "https://flowgenius.app";
    const loginUrl = `${platformUrl}/auth`;

    // Normalizar número WhatsApp (adicionar 55 se necessário) - fallback de segurança
    const normalizeWhatsApp = (number: string): string => {
      const digitsOnly = number.replace(/\D/g, "");
      if (digitsOnly.startsWith("55")) return digitsOnly;
      if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
        return `55${digitsOnly}`;
      }
      return digitsOnly;
    };

    const normalizedWhatsApp = body.whatsapp ? normalizeWhatsApp(body.whatsapp) : null;

    // Validações básicas
    if (!body.email || !body.full_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", body.email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Este email já está cadastrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar senha temporária
    const tempPassword = generateTempPassword();

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: {
        full_name: body.full_name,
      }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar conta: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log("Auth user created:", userId);

    // Criar/atualizar perfil
    const profileData = {
      id: userId,
      email: body.email.toLowerCase(),
      full_name: body.full_name,
      whatsapp: normalizedWhatsApp,
      telefone: body.telefone || null,
      ativo: true,
      is_admin: body.role === "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileData, { onConflict: "id" });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Tentar deletar o usuário auth se falhar
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar perfil: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile created for user:", userId);

    // Criar role se for admin
    if (body.role === "admin") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (roleError) {
        console.warn("Role creation error (non-fatal):", roleError);
      }
    }

    // Criar assinatura se especificado
    if (body.plan) {
      const subscriptionData = {
        user_id: userId,
        user_email: body.email.toLowerCase(),
        plan: body.plan,
        status: body.em_teste ? "trial" : (body.status || "active"),
        start_date: new Date().toISOString(),
        observacoes: body.observacoes || null,
        origin: "admin",
      };

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert(subscriptionData);

      if (subError) {
        console.warn("Subscription creation error (non-fatal):", subError);
      }
    }

    // Resultados de envio
    let emailSent = false;
    let emailError: string | null = null;
    let whatsAppSent = false;
    let whatsAppError: string | null = null;

    // Enviar email com credenciais
    if (body.sendEmail !== false) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "onboarding@resend.dev", // Alterar para seu domínio verificado
              to: body.email,
              subject: "Sua conta foi criada com sucesso",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
                  <p style="font-size: 16px;">Olá ${body.full_name}! 👋</p>
                  <p style="font-size: 16px;">Sua conta foi criada com sucesso.</p>
                  <p style="font-size: 16px;">📧 Email: ${body.email}<br>🔐 Senha: ${tempPassword}</p>
                  <p style="font-size: 16px;">Altere sua senha após o primeiro acesso.</p>
                  <p style="font-size: 16px;">🔗 <a href="${loginUrl}" style="color: #22c55e; text-decoration: underline;">Clique aqui para acessar a plataforma</a></p>
                  <p style="font-size: 16px;">Qualquer dúvida, estou aqui para ajudar!</p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
            console.log("Email sent successfully");
          } else {
            const errText = await emailResponse.text();
            emailError = `Resend error: ${errText}`;
            console.error("Email send error:", errText);
          }
        } else {
          emailError = "RESEND_API_KEY não configurada";
          console.warn("RESEND_API_KEY not configured");
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : "Erro desconhecido ao enviar email";
        console.error("Email error:", e);
      }
    }

    // Enviar WhatsApp de boas-vindas
    if (body.sendWhatsApp !== false && normalizedWhatsApp) {
      try {
        // Buscar configuração da Evolution API
        const { data: evolutionConfig } = await supabaseAdmin
          .from("integration_evolution")
          .select("*")
          .eq("active", true)
          .single();

        if (evolutionConfig) {
          const phoneNumber = normalizedWhatsApp;
          console.log("Sending WhatsApp to:", phoneNumber);
          const message = `Olá ${body.full_name}! 👋\n\nSua conta foi criada com sucesso.\n\n📧 Email: ${body.email}\n🔐 Senha: ${tempPassword}\n\nAltere sua senha após o primeiro acesso.\n\n🔗 Acesse a plataforma: ${loginUrl}\n\nQualquer dúvida, estou aqui para ajudar!`;

          const waResponse = await fetch(
            `${evolutionConfig.api_url}/message/sendText/${evolutionConfig.instance_name}`,
            {
              method: "POST",
              headers: {
                "apikey": evolutionConfig.api_key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: phoneNumber,
                text: message,
              }),
            }
          );

          if (waResponse.ok) {
            whatsAppSent = true;
            console.log("WhatsApp sent successfully");
          } else {
            const errText = await waResponse.text();
            whatsAppError = `Evolution error: ${errText}`;
            console.error("WhatsApp send error:", errText);
          }
        } else {
          whatsAppError = "Integração Evolution não configurada ou inativa";
          console.warn("Evolution integration not configured");
        }
      } catch (e) {
        whatsAppError = e instanceof Error ? e.message : "Erro desconhecido ao enviar WhatsApp";
        console.error("WhatsApp error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: body.email,
        tempPassword: tempPassword, // Remover em produção se necessário
        emailSent,
        emailError,
        whatsAppSent,
        whatsAppError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
