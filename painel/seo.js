// Central do site: "Melhorias SEO 24h". Reads data/seo-improvements.json, written by the monitor every 3 hours
// (and by the daily routine when it applies an item). Owner: auto = the routines do it, claude = ask Claude in a
// session, voce = the agency does it. Status: aberta, andamento, feita.
(function () {
  var REPO = 'avisionbranding-avision/perfect-services-site';
  var RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/data/seo-improvements.json';
  var $ = function (id) { return document.getElementById(id); };
  var OWNER = { auto: ['Automático', 'O monitor ou a rotina das 7h aplica sozinho'], claude: ['Claude', 'Peça no chat do Claude: "aplique a melhoria ' + '"'], voce: ['Você', 'Precisa de você'] };
  var AREA = { conteudo: 'Conteúdo', tecnico: 'Técnico', local: 'SEO local', links: 'Links', google: 'Google' };
  var STAT = { aberta: ['warning', 'Aberta'], andamento: ['pending', 'Em andamento'], feita: ['ok', 'Feita'] };
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function d(iso) { return iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''; }
  function ago(iso) { if (!iso) return ''; var s = Math.round((Date.now() - Date.parse(iso)) / 1000); return s < 3600 ? 'há ' + Math.max(1, Math.round(s / 60)) + ' min' : s < 86400 ? 'há ' + Math.round(s / 3600) + ' h' : 'há ' + Math.round(s / 86400) + ' d'; }
  function item(t, i) {
    var st = STAT[t.status] || STAT.aberta;
    var ow = OWNER[t.owner] || OWNER.auto;
    var meta = [AREA[t.area] || t.area, ow[0], t.page ? t.page.replace(/^https:\/\/[^/]+/, '') : null, t.status === 'feita' ? 'feita ' + d(t.doneAt) : 'vista ' + d(t.foundAt)].filter(Boolean).join(' · ');
    var det = mk('details', { class: 'task' + (t.status === 'feita' ? ' done' : '') }, [
      mk('summary', {}, [mk('span', { class: 'n', text: t.status === 'feita' ? '✓' : '#' + (i + 1) }), mk('span', {}, [mk('b', { text: t.title }), mk('small', { text: meta })]), mk('span', { class: 'pill', 'data-s': st[0], text: st[1] })]),
      mk('div', { class: 'body' }, [
        t.why ? mk('p', { class: 'why', style: 'margin:0', text: t.why }) : null,
        t.action ? mk('p', { style: 'margin:8px 0 0', text: (t.status === 'feita' ? 'O que foi feito: ' : 'O que fazer: ') + t.action }) : null,
        t.result ? mk('p', { class: 'vnote', text: 'Resultado: ' + t.result }) : null,
        t.status !== 'feita' && t.owner === 'claude' ? mk('p', { class: 'vnote', text: 'Para aplicar, escreva no chat do Claude: "aplique a melhoria ' + t.id + '".' }) : null,
        t.page ? mk('div', { class: 'acts' }, [mk('a', { class: 'btn', href: t.page, target: '_blank', rel: 'noopener', text: 'Abrir a página' })]) : null
      ])
    ]);
    return det;
  }
  function render(data) {
    var items = (data && data.items) || [];
    var rank = { andamento: 0, aberta: 1, feita: 2 };
    var open = items.filter(function (t) { return t.status !== 'feita'; }).sort(function (a, b) { return (rank[a.status] - rank[b.status]) || ((a.priority || 9) - (b.priority || 9)); });
    var done = items.filter(function (t) { return t.status === 'feita'; }).sort(function (a, b) { return String(b.doneAt || '').localeCompare(String(a.doneAt || '')); });
    var week = Date.now() - 7 * 86400000;
    $('seoK1').textContent = open.filter(function (t) { return t.status === 'andamento'; }).length;
    var mine = open.filter(function (t) { return t.owner === 'voce'; }).length;
    $('seoK2').textContent = mine;
    $('seoK3').textContent = done.filter(function (t) { return Date.parse(t.doneAt || 0) >= week; }).length;
    $('seoNow').textContent = data && data.now ? 'Última análise ' + ago(data.updatedAt) + ': ' + data.now : 'A primeira análise aparece aqui depois da próxima rodada do monitor (a cada 3 horas).';
    $('seoOpen').replaceChildren.apply($('seoOpen'), open.length ? open.map(item) : [mk('div', { class: 'empty', text: 'Nenhuma melhoria aberta agora.' })]);
    $('seoDone').replaceChildren.apply($('seoDone'), done.length ? done.slice(0, 25).map(item) : [mk('div', { class: 'empty', text: 'As melhorias aplicadas aparecem aqui.' })]);
    var pill = $('seoPill'); pill.dataset.s = open.length ? 'warning' : 'ok'; pill.textContent = open.length ? open.length + ' aberta' + (open.length === 1 ? '' : 's') : 'Em dia';
    var b = $('seoBadge'); b.hidden = !mine; b.textContent = mine;
  }
  function load() {
    fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return fetch('/data/seo-improvements.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }); })
      .then(render).catch(function () { render(null); });
  }
  load();
  setInterval(load, 2 * 60 * 1000);
})();
