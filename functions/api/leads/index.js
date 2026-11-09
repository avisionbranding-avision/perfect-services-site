// GET /api/leads: the latest leads for the panel (Leads tab). Protected by _middleware.js.
import { SCHEMA } from '../lead.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }) {
  if (!env.LEADS_DB) return json({ error: 'no_database', leads: [] }, 503);
  await env.LEADS_DB.prepare(SCHEMA).run();
  const { results = [] } = await env.LEADS_DB.prepare('SELECT id, created_at, form, status, status_at, data FROM leads ORDER BY created_at DESC LIMIT 300').all();
  const leads = results.map((r) => { let data = {}; try { data = JSON.parse(r.data); } catch { /* keep empty */ } return { id: r.id, createdAt: r.created_at, form: r.form, status: r.status, statusAt: r.status_at, ...data }; });
  return json({ forwardReady: !!(env.LEAD_FORWARD_EMAIL && env.RESEND_API_KEY), forwardName: env.LEAD_FORWARD_NAME || 'Tony', leads });
}
