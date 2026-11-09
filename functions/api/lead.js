// POST /api/lead: receives the estimate forms (home "estimate" and city pages "estimate-local").
// 1. Saves the lead in D1 (binding LEADS_DB), so no lead is ever lost.
// 2. Emails it to the agency (Resend: RESEND_API_KEY, LEAD_EMAIL_TO, optional LEAD_EMAIL_FROM).
// 3. Redirects the visitor to /thank-you.
// The agency reviews it in /painel/ (Leads tab) and forwards it to Tony by SMS.

export const SCHEMA = `CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  form TEXT, name TEXT, phone TEXT, zip TEXT, service TEXT, page TEXT,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  status_at TEXT
)`;

const FIELDS = ['name', 'phone', 'address', 'zip', 'service', 'bedrooms', 'bathrooms', 'frequency', 'message', 'page'];
const LABELS = { name: 'Nome', phone: 'Telefone', address: 'Endereço', zip: 'CEP (ZIP)', service: 'Serviço', bedrooms: 'Quartos', bathrooms: 'Banheiros', frequency: 'Frequência', message: 'Mensagem', page: 'Página do site' };
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const escHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thanks = (request) => Response.redirect(new URL('/thank-you', request.url).toString(), 303);

function failPage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Perfect Services</title><body style="font:16px/1.5 system-ui;max-width:520px;margin:40px auto;padding:0 16px"><h1>Sorry, something went wrong</h1><p>We could not receive your request. Please call <a href="tel:+18643995168">(864) 399-5168</a> or text <a href="sms:+18646668520">(864) 666-8520</a> and we will schedule your free in-home estimate.</p></body>', { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// Sends one email through Resend. Returns true when accepted.
export async function sendResend(env, to, subject, html, text) {
  const list = String(to || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || !list.length) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.LEAD_EMAIL_FROM || 'Perfect Services Leads <onboarding@resend.dev>', to: list, subject, html, text }),
    });
    return r.ok;
  } catch { return false; }
}

const telHref = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = `1${d}`; return d ? `+${d}` : ''; };

// The lead details as an email body. intro: the heading; extra: optional closing HTML.
export function leadEmail(data, intro, extraHtml = '', extraText = '') {
  const rows = FIELDS.filter((k) => data[k]).map((k) => {
    const v = escHtml(String(data[k]));
    const cell = k === 'phone' && telHref(data[k]) ? `<a href="tel:${telHref(data[k])}">${v}</a>` : v;
    return `<tr><td style="padding:4px 12px 4px 0;color:#5B6B78;vertical-align:top">${LABELS[k]}</td><td style="padding:4px 0"><b>${cell}</b></td></tr>`;
  }).join('');
  const html = `<div style="font:15px/1.5 Arial,sans-serif"><h2 style="margin:0 0 8px">${escHtml(intro)}</h2><table>${rows}</table>${extraHtml}</div>`;
  const text = `${intro}\n\n${FIELDS.filter((k) => data[k]).map((k) => `${LABELS[k]}: ${data[k]}`).join('\n')}${extraText ? `\n\n${extraText}` : ''}`;
  return { html, text };
}

function sendEmail(env, lead) {
  const panel = env.PANEL_URL || 'https://perfectservicespaintingcleaning.com/painel/#leads';
  const { html, text } = leadEmail(lead.data, 'Novo pedido de orçamento',
    `<p style="margin-top:16px"><a href="${panel}">Abrir o painel para aprovar e enviar ao Tony</a></p><p style="color:#5B6B78;font-size:12px">Recebido em ${lead.created_at} (UTC). Formulário: ${escHtml(lead.form)}.</p>`,
    `Painel: ${panel}`);
  const subject = `Novo lead: ${lead.data.name || 'sem nome'} · ${lead.data.service || 'serviço'} · ${lead.data.zip || ''}`.trim();
  return sendResend(env, env.LEAD_EMAIL_TO, subject, html, text);
}

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return new Response('Bad request', { status: 400 }); }
  // Honeypot: bots fill the hidden "company" field. Pretend success, store nothing.
  if (clip(form.get('company'), 200)) return thanks(request);

  const data = {};
  for (const k of FIELDS) { const v = clip(form.get(k), k === 'message' ? 2000 : 200); if (v) data[k] = v; }
  const digits = (data.phone || '').replace(/\D/g, '');
  if (!data.name || digits.length < 10) return new Response('Please go back and fill in your name and phone.', { status: 400 });

  const lead = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    form: clip(form.get('form-name'), 40) || 'estimate',
    data,
  };
  data.referer = clip(request.headers.get('referer'), 300) || undefined;

  let saved = false;
  if (env.LEADS_DB) {
    try {
      await env.LEADS_DB.prepare(SCHEMA).run();
      await env.LEADS_DB.prepare('INSERT INTO leads (id, created_at, form, name, phone, zip, service, page, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
        .bind(lead.id, lead.created_at, lead.form, data.name, data.phone, data.zip || null, data.service || null, data.page || null, JSON.stringify(data)).run();
      saved = true;
    } catch { saved = false; }
  }
  const emailed = await sendEmail(env, lead);
  if (!saved && !emailed) return failPage();
  return thanks(request);
}

export function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
}
