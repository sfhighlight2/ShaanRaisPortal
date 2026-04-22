import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const adminClient = createClient(
      supabaseUrl!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify authentication
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized – invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin or manager
    const callerProfile = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile.error || callerProfile.data?.role === "client") {
      return new Response(JSON.stringify({ error: `Insufficient permissions: ${callerProfile.error?.message || "clients cannot manage users"}` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── Update action ──
    if (action === "update") {
      const { user_id, first_name, last_name } = body;
      if (!user_id) throw new Error("user_id is required");
      if (!first_name) throw new Error("first_name is required");
      const updates: Record<string, unknown> = { first_name };
      if (last_name !== undefined) updates.last_name = last_name;
      if (body.role) updates.role = body.role;
      const { error } = await adminClient.from("profiles").update(updates).eq("id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete user action ──
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) throw new Error("user_id is required");
      // Delete associated data before removing the user
      const { data: profile, error: profileErr } = await adminClient.from("profiles").select("role, client_id").eq("id", user_id).single();
      if (profileErr) throw profileErr;

      // If this is a client user, clear the clients.user_id reference
      if (profile?.client_id) {
        await adminClient.from("clients").update({ user_id: null }).eq("id", profile.client_id);
      }

      await adminClient.from("notifications").delete().eq("user_id", user_id);
      await adminClient.from("activity_logs").delete().eq("user_id", user_id);
      const { error } = await adminClient.from("profiles").delete().eq("id", user_id);
      if (error) throw error;
      const { error: authDelErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (authDelErr) throw authDelErr;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete question action ──
    if (action === "delete_question") {
      const { question_id } = body;
      if (!question_id) throw new Error("question_id is required");
      const { error } = await adminClient.from("questions").delete().eq("id", question_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete template action ──
    if (action === "delete_template") {
      const { template_id } = body;
      if (!template_id) throw new Error("template_id is required");
      await adminClient.from("template_tasks").delete().eq("phase_id", template_id);
      await adminClient.from("template_deliverables").delete().eq("phase_id", template_id);
      const { error } = await adminClient.from("template_phases").delete().eq("id", template_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete template phase action ──
    if (action === "delete_template_phase") {
      const { template_id } = body;
      if (!template_id) throw new Error("template_id is required");
      const { data: phases, error: phasesErr } = await adminClient.from("template_phases").select("id").eq("template_id", template_id);
      if (!phasesErr && phases && phases.length > 0) {
        const phaseIds = phases.map((p: any) => p.id);
        await adminClient.from("template_tasks").delete().in("phase_id", phaseIds);
        await adminClient.from("template_deliverables").delete().in("phase_id", phaseIds);
        await adminClient.from("template_phases").delete().eq("template_id", template_id);
      }
      const { error } = await adminClient.from("package_templates").delete().eq("id", template_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Batch update tasks sort order ──
    if (action === "batch_sort_tasks") {
      const { tasks } = body;
      if (!tasks || !Array.isArray(tasks)) throw new Error("tasks array is required");
      for (const t of tasks) {
        await adminClient.from("template_tasks").update({ sort_order: t.sort_order }).eq("id", t.id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Batch update phases sort order ──
    if (action === "batch_sort_phases") {
      const { phases } = body;
      if (!phases || !Array.isArray(phases)) throw new Error("phases array is required");
      for (const p of phases) {
        await adminClient.from("template_phases").update({ sort_order: p.sort_order }).eq("id", p.id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Batch update deliverables sort order ──
    if (action === "batch_sort_deliverables") {
      const { deliverables } = body;
      if (!deliverables || !Array.isArray(deliverables)) throw new Error("deliverables array is required");
      for (const d of deliverables) {
        await adminClient.from("template_deliverables").update({ sort_order: d.sort_order }).eq("id", d.id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete notification action ──
    if (action === "delete_notification") {
      const { notification_id } = body;
      if (!notification_id) throw new Error("notification_id is required");
      const { error } = await adminClient.from("notifications").delete().eq("id", notification_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Delete auth user action ──
    if (action === "delete_auth") {
      const { user_id } = body;
      if (!user_id) throw new Error("user_id is required");
      await adminClient.from("profiles").delete().eq("id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Update profile action ──
    if (action === "update_profile") {
      const { user_id, ...updates } = body;
      const allowedFields: Record<string, unknown> = {};
      if (updates.first_name) allowedFields.first_name = updates.first_name;
      if (updates.last_name) allowedFields.last_name = updates.last_name;
      if (updates.role) allowedFields.role = updates.role;
      if (updates.status) allowedFields.status = updates.status;
      const { error } = await adminClient.from("profiles").update(allowedFields).eq("id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Default: Create user ──
    const { email, password, first_name, last_name, role, client_id } = body;

    // Create Supabase auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    let userId: string;

    if (createError) {
      // Check if the user already exists (duplicate email)
      const duplicateEmail =
        createError.message?.includes("already been registered") ||
        createError.message?.includes("already exists");

      if (duplicateEmail) {
        // Try to find the existing auth user
        const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email);
        if (!existingUser) {
          throw new Error("User exists in auth but could not be found. Please contact support.");
        }
        // Adopt orphaned auth user
        userId = existingUser.user.id;
      } else {
        throw createError;
      }
    } else {
      userId = newUser.user.id;
    }

    // Upsert profile – handles both brand-new users and orphaned auth users
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      first_name,
      last_name,
      role: role || "team_member",
      status: "active",
      // ── NEW: Link profile to client account when creating a client user ──
      ...(client_id ? { client_id } : {}),
    });
    if (profileError) throw new Error(`Profile upsert failed: ${profileError.message}`);

    // ── NEW: Link client record back to the new user ──
    if (client_id) {
      const { error: clientLinkError } = await adminClient
        .from("clients")
        .update({ user_id: userId })
        .eq("id", client_id);
      if (clientLinkError) {
        console.error("Failed to link client.user_id:", clientLinkError.message);
        // Non-fatal — profile is already created, so we log but don't throw
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    let message = String(err);
    if (err?.message) {
      message = err.message;
    } else if (typeof err === "object") {
      try { message = JSON.stringify(err); } catch(e) {}
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
