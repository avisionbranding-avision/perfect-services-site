// POST /api/leads/<id> with JSON {"status": "passed" | "sent" | "discarded" | "new"}: marks a lead in the panel.
// "passed" = the agency forwarded it by hand. "sent" (optional, only when configured) first emails the lead to Tony (LEAD_FORWARD_EMAIL) and is only saved when that email was accepted.
// Protected by _middleware.js.
import { sendResend, leadEmail } from '../lead.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ALLOWED = new Set(['new', 'sent', 'passed', 'discarded']);

export async function onRequestPost({ request, env, params }) {
  if (!env.LEADS_DB) return json({ error: 'no_database' }, 503);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  if (!ALLOWED.has(body.status)) return json({ error: 'bad_status' }, 400);
  const id = String(params.id);

  if (body.status === 'sent') {
    if (!env.LEAD_FORWARD_EMAIL) return json({ error: 'no_forward_email' }, 400);
    const row = await env.LEADS_DB.prepare('SELECT created_at, data FROM leads WHERE id = ?1').bind(id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    let data = {};
    try { data = JSON.parse(row.data); } catch { /* keep empty */ }
    const name = env.LEAD_FORWARD_NAME || 'Tony';
    const { html, text } = leadEmail(data, `${name}, novo cliente para orçamento`,
      '<p style="margin-top:16px">Ligue ou mande mensagem para marcar a visita de orçamento grátis. Lembrete: preço só depois de ver a casa.</p>',
      'Ligue ou mande mensagem para marcar a visita de orçamento grátis. Preço só depois de ver a casa.');
    const ok = await sendResend(env, env.LEAD_FORWARD_EMAIL, `Novo cliente: ${data.name || ''} · ${data.service || ''} · ${data.zip || ''}`.trim(), html, text);
    if (!ok) return json({ error: 'email_failed' }, 502);
  }

  const r = await env.LEADS_DB.prepare('UPDATE leads SET status = ?1, status_at = ?2 WHERE id = ?3').bind(body.status, new Date().toISOString(), id).run();
  if (!r.meta || !r.meta.changes) return json({ error: 'not_found' }, 404);
  return json({ ok: true });
}
