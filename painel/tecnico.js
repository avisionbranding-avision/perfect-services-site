// Central do site: "Técnico". Live checks from this browser: Cloudflare is serving the site, the published build
// matches the latest GitHub commit, the lead form and lead list answer, GTM is on the page, the sitemap is readable,
// and the two Claude routines ran on time. Netlify is no longer used.
(function () {
  var REPO = 'avisionbranding-avision/perfect-services-site';
  var API = 'https://api.github.com/repos/' + REPO + '/commits?per_page=40';
  var GTM = 'GTM-WTM3FM9G';
  var $ = function (id) { return document.getElementById(id); };
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  var LBL = { ok: 'OK', warning: 'Atenção', error: 'Erro', pending: 'Conferindo', info: 'Info' };
  function row(s, title, detail) { return mk('li', { 'data-s': s === 'info' ? 'ok' : s }, [mk('div', {}, [mk('b', { text: title }), mk('span', { text: detail || '' })]), mk('span', { class: 'pill', 'data-s': s === 'info' ? 'pending' : s, text: LBL[s] || s })]); }
  function ago(t) { if (!t) return '—'; var s = Math.round((Date.now() - t) / 1000); return s < 3600 ? 'há ' + Math.max(1, Math.round(s / 60)) + ' min' : s < 86400 ? 'há ' + Math.round(s / 3600) + ' h' : 'há ' + Math.round(s / 86400) + ' d'; }
  function when(t) { return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function get(url, opt) { return fetch(url, Object.assign({ cache: 'no-store' }, opt || {})); }
  var commitsCache = null, commitsAt = 0;
  function commits() {
    if (commitsCache && Date.now() - commitsAt < 5 * 60 * 1000) return Promise.resolve(commitsCache);
    return get(API).then(function (r) { return r.ok ? r.json() : []; }).then(function (c) { commitsCache = c; commitsAt = Date.now(); return c; }).catch(function () { return commitsCache || []; });
  }
  function nextDaily() { var n = new Date(); var t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 10, 0, 0)); if (t <= n) t.setUTCDate(t.getUTCDate() + 1); return t; }
  function run() {
    var t0 = Date.now();
    Promise.all([
      get('/', { method: 'HEAD' }).then(function (r) { return { ok: r.ok, server: r.headers.get('server') || '' }; }).catch(function () { return { ok: false, server: '' }; }),
      get('/data/status.json?t=' + t0).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      commits(),
      get('/api/lead').then(function (r) { return r.status; }).catch(function () { return 0; }),
      get('/api/leads').then(function (r) { return r.ok ? r.json().then(function (j) { return { st: r.status, n: (j.leads || []).length, nw: (j.leads || []).filter(function (l) { return l.status === 'new'; }).length }; }) : { st: r.status }; }).catch(function () { return { st: 0 }; }),
      get('/?gtm=' + t0).then(function (r) { return r.text(); }).catch(function () { return ''; }),
      get('/sitemap.xml?t=' + t0).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
    ]).then(function (res) {
      var home = res[0], status = res[1], cs = res[2] || [], leadSt = res[3], leads = res[4], html = res[5], sm = res[6];
      var rows = [], bad = 0;
      var add = function (s, a, b) { if (s === 'warning' || s === 'error') bad++; rows.push(row(s, a, b)); };
      var onCf = /cloudflare/i.test(home.server);
      add(home.ok && onCf ? 'ok' : home.ok ? 'warning' : 'error', 'Site no ar pela Cloudflare', home.ok ? (onCf ? location.hostname + ' respondendo pelo servidor da Cloudflare, com HTTPS.' : 'Respondendo, mas não pela Cloudflare (servidor: ' + (home.server || '?') + ').') : 'O site não respondeu agora.');
      var deploys = cs.filter(function (c) { return !/\[skip ci\]/i.test(c.commit.message); });
      var lastDeploy = deploys[0] ? Date.parse(deploys[0].commit.committer.date) : 0;
      var built = status && status.generatedAt ? Date.parse(status.generatedAt) : 0;
      if (!lastDeploy || !built) add('pending', 'Versão publicada = GitHub', 'Não deu para comparar agora.');
      else if (built >= lastDeploy - 60000) add('ok', 'Versão publicada = GitHub', 'O site no ar é a última versão do GitHub (gerada ' + ago(built) + ').');
      else if (Date.now() - lastDeploy < 10 * 60000) add('pending', 'Versão publicada = GitHub', 'Publicação em andamento na Cloudflare (enviada ' + ago(lastDeploy) + ').');
      else add('warning', 'Versão publicada = GitHub', 'O GitHub tem uma versão de ' + when(lastDeploy) + ' que ainda não está no ar. Confira a Cloudflare.');
      add(leadSt === 405 ? 'ok' : 'error', 'Formulário de orçamento', leadSt === 405 ? 'Recebendo pedidos em /api/lead (salva no banco e envia e-mail pelo Resend).' : 'O endereço do formulário não respondeu como esperado (' + leadSt + ').');
      add(leads.st === 200 ? 'ok' : 'warning', 'Banco de leads', leads.st === 200 ? leads.n + ' pedidos guardados, ' + leads.nw + ' novos esperando.' : 'A lista de leads não respondeu (' + leads.st + ').');
      add('info', 'E-mail dos leads (Resend)', 'Cada pedido manda e-mail para avisionbranding@gmail.com. Último teste completo: 10/11, envio aceito.');
      var hasGtm = html.indexOf(GTM) > -1;
      add(hasGtm ? 'ok' : 'error', 'Google Tag Manager no site', hasGtm ? GTM + ' instalado; ele carrega o Analytics e os eventos de contato.' : 'O código do GTM não apareceu na página inicial.');
      var urls = (sm.match(/<loc>/g) || []).length;
      add(urls > 100 ? 'ok' : 'warning', 'Sitemap', urls ? urls + ' endereços no sitemap.xml, lido pelo Search Console.' : 'Não deu para ler o sitemap.');
      add('info', 'Netlify', 'Não é mais usado. Depois de 2 ou 3 dias estável, baixe o CSV dos pedidos antigos e desligue o site lá.');
      $('tecChecks').replaceChildren.apply($('tecChecks'), rows);
      var pill = $('tecPill'); pill.dataset.s = bad ? 'warning' : 'ok'; pill.textContent = bad ? bad + ' ponto' + (bad === 1 ? '' : 's') + ' para olhar' : 'Tudo certo';
      var b = $('tecBadge'); b.hidden = !bad; b.textContent = bad;

      // routines
      var daily = cs.find(function (c) { return /^Daily articles/i.test(c.commit.message); });
      var mon = cs.find(function (c) { return /^Monitor/i.test(c.commit.message); });
      var dT = daily ? Date.parse(daily.commit.committer.date) : 0, mT = mon ? Date.parse(mon.commit.committer.date) : 0;
      var r2 = [];
      r2.push(row(dT && Date.now() - dT < 27 * 3600000 ? 'ok' : 'warning', 'Artigos do dia (7h de São Paulo)', (daily ? 'Última: ' + daily.commit.message.split('\n')[0] + ' · ' + when(dT) + '. ' : 'Nenhuma execução recente. ') + 'Próxima: ' + nextDaily().toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '.'));
      r2.push(row(mT && Date.now() - mT < 4.5 * 3600000 ? 'ok' : 'warning', 'Monitor e melhorias SEO (a cada 3 h)', mon ? 'Última rodada ' + ago(mT) + ' (' + when(mT) + '). Verifica o site, as buscas, o Google Meu Negócio e anota melhorias.' : 'Nenhuma rodada recente.'));
      $('tecRoutines').replaceChildren.apply($('tecRoutines'), r2);
      var kind = function (m) { return /^Daily articles/i.test(m) ? ['art', 'Artigos'] : /^Monitor fix/i.test(m) ? ['fix', 'Correção'] : /^Monitor/i.test(m) ? ['mon', 'Verificação'] : ['', 'Site']; };
      $('tecFeed').replaceChildren.apply($('tecFeed'), cs.slice(0, 15).map(function (c) {
        var msg = c.commit.message.split('\n')[0].replace(/\s*\[skip (netlify|ci)\]/gi, '');
        var k = kind(msg); var at = Date.parse(c.commit.committer.date);
        return mk('li', {}, [mk('span', { class: 'tag ' + k[0] + ' k', text: k[1] }), mk('span', { class: 't', text: msg }), mk('span', { class: 'w', text: when(at) + ' · ' + ago(at) })]);
      }));
    });
  }
  run();
  setInterval(run, 2 * 60 * 1000);
})();
