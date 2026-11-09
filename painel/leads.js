// Perfect Services panel: Leads tab. Reads /api/leads (Cloudflare Pages Function, protected by Cloudflare Access),
// lets the agency filter each estimate request and forward the good ones to Tony by WhatsApp (free) or SMS.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var state = { leads: [], forwardTo: '', forwardName: 'Tony', filter: 'new', error: null };
  var STATUS = { new: ['Novo', 'warning'], sent: ['Enviado ao Tony', 'ok'], passed: ['Repassado', 'ok'], discarded: ['Descartado', 'idle'] };
  var DONE = { sent: 1, passed: 1 };

  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function when(iso) {
    try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
  }
  function digits(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d ? '+' + d : ''; }
  function smsBody(l) {
    var parts = ['Novo orçamento (site Perfect Services)', 'Nome: ' + (l.name || ''), 'Telefone: ' + (l.phone || '')];
    if (l.service) parts.push('Serviço: ' + l.service);
    if (l.address) parts.push('Endereço: ' + l.address);
    if (l.zip) parts.push('CEP: ' + l.zip);
    var rooms = [l.bedrooms ? l.bedrooms + ' quartos' : '', l.bathrooms ? l.bathrooms + ' banheiros' : ''].filter(Boolean).join(', ');
    if (rooms) parts.push(rooms);
    if (l.frequency) parts.push('Frequência: ' + l.frequency);
    if (l.page) parts.push('Página: ' + l.page);
    if (l.message) parts.push('Mensagem: ' + l.message);
    parts.push('Recebido: ' + when(l.createdAt));
    return parts.join('\n');
  }
  // Saves the status on the server first ("sent" also emails the lead to Tony there), then updates the card.
  function setStatus(l, status, btn) {
    if (btn) { btn.disabled = true; btn.textContent = status === 'sent' ? 'Enviando…' : 'Salvando…'; }
    return fetch('/api/leads/' + encodeURIComponent(l.id), { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: status }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || r.status); }); })
      .then(function () { l.status = status; l.statusAt = new Date().toISOString(); state.error = null; render(); })
      .catch(function (e) {
        var why = String(e && e.message);
        state.error = why === 'email_failed' ? 'O e-mail para o ' + state.forwardName + ' não foi enviado. Confira a chave do Resend e o domínio verificado na Cloudflare, e tente de novo.'
          : why === 'no_forward_email' ? 'Falta configurar LEAD_FORWARD_EMAIL (e-mail do ' + state.forwardName + ') na Cloudflare.'
          : 'Não consegui salvar. Atualize a página e tente de novo.';
        render();
      });
  }

  function card(l) {
    var st = STATUS[l.status] || STATUS.new;
    var rows = [['Telefone', l.phone], ['Serviço', l.service], ['Endereço', l.address], ['CEP', l.zip],
      ['Quartos', l.bedrooms], ['Banheiros', l.bathrooms], ['Frequência', l.frequency], ['Página', l.page]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return mk('div', { class: 'row' }, [mk('b', { text: r[0] }), mk('span', { text: r[1] })]); });
    var acts = [];
    if (!DONE[l.status]) {
      if (state.forwardReady) {
        var go = mk('button', { class: 'btn go', type: 'button', text: 'Aprovar e enviar ao ' + state.forwardName + ' (e-mail)' });
        go.addEventListener('click', function () { setStatus(l, 'sent', go); });
        acts.push(go);
      } else {
        var mark = mk('button', { class: 'btn go', type: 'button', text: 'Marcar como repassado' });
        mark.addEventListener('click', function () { setStatus(l, 'passed', mark); });
        acts.push(mark);
      }
      var copy = mk('button', { class: 'btn', type: 'button', text: 'Copiar texto' });
      copy.addEventListener('click', function () { navigator.clipboard.writeText(smsBody(l)).then(function () { copy.textContent = 'Copiado'; }); });
      acts.push(copy);
    }
    var lp = digits(l.phone);
    if (lp) { acts.push(mk('a', { class: 'btn', href: 'tel:' + lp, text: 'Ligar para o lead' })); }
    if (l.status === 'new') {
      var del = mk('button', { class: 'btn', type: 'button', text: 'Descartar' });
      del.addEventListener('click', function () { setStatus(l, 'discarded', del); });
      acts.push(del);
    } else {
      var back = mk('button', { class: 'btn', type: 'button', text: 'Voltar para novos' });
      back.addEventListener('click', function () { setStatus(l, 'new', back); });
      acts.push(back);
    }
    return mk('article', { class: 'gpost' + (DONE[l.status] ? ' done' : '') }, [
      mk('div', { class: 'top' }, [mk('span', { class: 'where', text: when(l.createdAt) + (l.form === 'estimate' ? ' · página inicial' : ' · página de cidade') }), mk('span', { class: 'pill', 'data-s': st[1], text: st[0] + (l.statusAt && l.status !== 'new' ? ' ' + when(l.statusAt) : '') })]),
      mk('h3', { text: l.name || 'Sem nome' }),
      mk('div', {}, rows),
      l.message ? mk('div', { class: 'txt', text: l.message }) : null,
      mk('div', { class: 'acts' }, acts),
    ]);
  }

  function render() {
    var box = $('leadList'); if (!box) return;
    var now = new Date(); var month = now.toISOString().slice(0, 7);
    var inMonth = state.leads.filter(function (l) { return String(l.createdAt).slice(0, 7) === month; });
    var count = function (s) { return state.leads.filter(function (l) { return l.status === s; }).length; };
    $('lkNew').textContent = count('new');
    $('lkMonth').textContent = inMonth.length;
    $('lkSent').textContent = inMonth.filter(function (l) { return DONE[l.status]; }).length;
    var badge = $('leadBadge'); var n = count('new'); badge.hidden = !n; badge.textContent = n;
    document.querySelectorAll('[data-lfilter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lfilter === state.filter)); });
    var msg = $('leadMsg');
    msg.hidden = !state.error; msg.textContent = state.error || '';
    var shown = state.leads.filter(function (l) { return state.filter === 'all' || l.status === state.filter || (state.filter === 'sent' && DONE[l.status]); });
    if (!shown.length) {
      box.replaceChildren(mk('div', { class: 'empty', text: state.filter === 'new' ? 'Nenhum lead novo esperando. Quando alguém pedir orçamento, ele aparece aqui e no seu e-mail.' : 'Nada nesta lista.' }));
      return;
    }
    box.replaceChildren.apply(box, shown.map(card));
  }

  function load() {
    fetch('/api/leads', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (r.status === 404 || r.status === 405) { state.error = 'A lista de leads não respondeu. Os pedidos continuam chegando no e-mail da Avision; tente de novo em alguns minutos.'; return null; }
      if (r.status === 401) { state.error = 'Acesso não autorizado. Entre no painel pelo login da Cloudflare (código no seu e-mail) e atualize a página.'; return null; }
      if (r.status === 503) { state.error = 'O banco de leads ainda não foi ligado ao site na Cloudflare (LEADS_DB).'; return null; }
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      if (!d) { render(); return; }
      state.error = null; state.leads = d.leads || []; state.forwardReady = !!d.forwardReady; state.forwardName = d.forwardName || 'Tony';
      render();
    }).catch(function () { state.error = 'Não consegui carregar os leads agora. Tento de novo em 1 minuto.'; render(); });
  }

  document.querySelectorAll('[data-lfilter]').forEach(function (b) {
    b.addEventListener('click', function () { state.filter = b.dataset.lfilter; render(); });
  });
  var rb = $('leadRefresh'); if (rb) rb.addEventListener('click', load);
  load();
  setInterval(load, 60 * 1000);
})();
