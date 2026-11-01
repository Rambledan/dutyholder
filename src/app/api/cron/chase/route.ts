import { timingSafeEqual } from "node:crypto";
import { runChase, stripContext } from "@/lib/chase/run";
import type { ChaseState } from "@/lib/chase/plan";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// Called by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorised", { status: 401 });

  const db = createAdminClient();
  const appUrl = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");

  const summary = await runChase(
    {
      async loadState() {
        const { data, error } = await db.rpc("chase_state");
        if (error) throw new Error(error.message);
        return data as unknown as ChaseState;
      },
      async claim(planned) {
        const { data, error } = await db.rpc("claim_reminders", { p_reminders: stripContext(planned) });
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => ({ id: r.id, member_id: r.member_id, step_key: r.step_key }));
      },
      async finish(ids, status, detail) {
        const { error } = await db.rpc("finish_reminders", { p_ids: ids, p_status: status, p_detail: detail });
        if (error) throw new Error(error.message);
      },
      send: (message) => sendEmail(message),
    },
    appUrl,
  );

  return Response.json({ ok: true, ...summary });
}
