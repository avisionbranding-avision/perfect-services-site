// Perfect Services panel: Search Console & Analytics routine (what to do, when, and how).
// Progress is kept in this browser (per day / week / month / once).
(function () {
  var LS = 'ps-gscga-v1';
  var START = '2026-11-09';
  var SITE = 'https://perfectservicespaintingcleaning.com/';
  var GSC = 'https://search.google.com/search-console?resource_id=sc-domain%3Aperfectservicespaintingcleaning.com';
  var GA = 'https://analytics.google.com/';
  var TASKS = [
    // ---- daily ----
    { id: 'gsc-inspect', when: 'daily', tool: 'Search Console', title: 'Pedir indexação dos 10 links do dia',
      why: 'Acelera a entrada das páginas principais no Google (limite do Google: cerca de 10 por dia).',
      steps: ['Aba "Site e SEO" → seção "Inspecionar hoje no Google"', 'Abra cada link → Solicitar indexação → marque Feito'], link: '#inspecionar', time: '5 min' },
    { id: 'ga-leads', when: 'daily', tool: 'Analytics', title: 'Conferir os pedidos de orçamento de ontem',
      why: 'Lead respondido rápido fecha mais. Confere se nenhum pedido ficou sem retorno.',
      steps: ['Analytics → Relatórios → Engajamento → Eventos', 'Veja generate_lead, click_call e click_sms de ontem', 'Compare com os pedidos recebidos na aba Leads: todos foram respondidos?'], link: GA, time: '3 min' },
    // ---- weekly (Mondays) ----
    { id: 'gsc-pages', when: 'weekly', tool: 'Search Console', title: 'Quantas páginas o Google já indexou',
      why: 'Mostra se o Google está aceitando as páginas e os artigos diários.',
      steps: ['Search Console → Indexação → Páginas', 'Anote "Indexadas" e "Não indexadas"', 'Clique em cada motivo de "Não indexadas" e tire um print', 'Me mande os prints: eu ajusto o que for preciso'], link: GSC, time: '5 min', send: true },
    { id: 'gsc-performance', when: 'weekly', tool: 'Search Console', title: 'Buscas, cliques e posições da semana',
      why: 'Mostra quais cidades e serviços começam a aparecer e quais páginas estão perto do topo.',
      steps: ['Search Console → Desempenho → Resultados da pesquisa → últimos 7 dias', 'Ative as 4 caixas: Cliques, Impressões, CTR e Posição média', 'Tire print da aba Consultas e da aba Páginas (ordenadas por Impressões)', 'Me mande os prints: páginas na posição 8 a 20 recebem reforço'], link: GSC, time: '5 min', send: true },
    { id: 'gsc-sitemap-check', when: 'weekly', tool: 'Search Console', title: 'Status do sitemap',
      why: 'Confirma que o Google está lendo as páginas novas que entram todo dia.',
      steps: ['Search Console → Sitemaps', 'Status deve estar "Processado" e "Páginas encontradas" deve crescer a cada semana'], link: GSC, time: '1 min' },
    { id: 'ga-acquisition', when: 'weekly', tool: 'Analytics', title: 'De onde vêm as visitas e os pedidos',
      why: 'Mostra quanto vem do Google, do Google Meu Negócio (posts), de anúncios e de redes sociais.',
      steps: ['Analytics → Relatórios → Aquisição → Aquisição de tráfego → últimos 7 dias', 'Veja Sessões e Eventos-chave por "Origem/mídia" (ex.: google / organic, google / gbp_post)', 'Tire print e me mande'], link: GA, time: '3 min', send: true },
    { id: 'ga-pages', when: 'weekly', tool: 'Analytics', title: 'Páginas que mais geram pedidos',
      why: 'Diz quais cidades e serviços convertem, para focar posts, anúncios e artigos nelas.',
      steps: ['Analytics → Relatórios → Engajamento → Páginas e telas → últimos 7 dias', 'Ordene por "Eventos-chave"', 'Tire print do top 20 e me mande'], link: GA, time: '3 min', send: true },
    // ---- monthly (1st) ----
    { id: 'gsc-cwv', when: 'monthly', tool: 'Search Console', title: 'Velocidade e experiência no celular',
      why: 'Páginas lentas perdem posição. A maioria das visitas de limpeza vem do celular.',
      steps: ['Search Console → Experiência → Core Web Vitals', 'Se aparecer "Ruim" ou "Precisa de melhorias", tire print e me mande'], link: GSC, time: '2 min', send: true },
    { id: 'gsc-month', when: 'monthly', tool: 'Search Console', title: 'Comparar o mês com o anterior',
      why: 'Mede o crescimento real do SEO: cliques, impressões e posição média.',
      steps: ['Desempenho → Data → Comparar → "Comparar os últimos 28 dias com o período anterior"', 'Tire print do gráfico e da aba Consultas'], link: GSC, time: '3 min', send: true },
    { id: 'ga-month', when: 'monthly', tool: 'Analytics', title: 'Pedidos de orçamento do mês por cidade',
      why: 'Mostra o retorno do trabalho para o cliente e onde investir no mês seguinte.',
      steps: ['Relatórios → Engajamento → Eventos → generate_lead → últimos 28 dias', 'Adicione a dimensão page_city (ou veja por Página)', 'Tire print e me mande: eu monto o relatório do mês para o cliente'], link: GA, time: '5 min', send: true }
  ];
  var LABEL = { once: 'Configuração (uma vez)', daily: 'Todo dia', weekly: 'Toda segunda-feira', monthly: 'Todo dia 1º do mês' };
  var $ = function (id) { return document.getElementById(id); };
  function pad(n) { return String(n).padStart(2, '0'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function weekKey() { var d = new Date(); var day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return 'w' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function monthKey() { var d = new Date(); return 'm' + d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function periodKey(t) { return t.when === 'daily' ? today() : t.when === 'weekly' ? weekKey() : t.when === 'monthly' ? monthKey() : 'once'; }
  function load() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
  function isDone(t, s) { return t.preDone || (s[t.id] && s[t.id] === periodKey(t)); }
  function nextDue(t) {
    var d = new Date();
    if (t.when === 'weekly') { var add = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + add); return 'próxima: ' + d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
    if (t.when === 'monthly') { d = new Date(d.getFullYear(), d.getMonth() + 1, 1); return 'próxima: ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    if (t.when === 'daily') return 'próxima: amanhã';
    return '';
  }
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function render() {
    var s = load();
    var now = today();
    var groups = ['daily', 'weekly', 'monthly']; // one-time setup lives in google.js
    var pending = 0;
    var weekday = new Date().getDay();
    groups.forEach(function (g) {
      var box = $('gg-' + g); if (!box) return;
      var list = TASKS.filter(function (t) { return t.when === g; });
      box.replaceChildren.apply(box, list.map(function (t, i) {
        var done = isDone(t, s);
        var notYet = t.from && t.from > now && !done;
        var dom = new Date().getDate();
        var inWindow = g === 'monthly' ? dom <= 5 : true;
        var dueNow = !done && !notYet && inWindow;
        if (dueNow) pending++;
        var btn = t.preDone ? null : mk('button', { class: 'btn ' + (done ? '' : 'ok'), type: 'button', text: done ? 'Desfazer' : 'Marcar como feito' });
        if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); var st = load(); if (isDone(t, st)) delete st[t.id]; else st[t.id] = periodKey(t); save(st); render(); });
        var pillTxt = done ? 'Feito' : notYet ? 'A partir de ' + t.from.split('-').reverse().slice(0, 2).join('/') : !inWindow ? 'No dia 1º' : 'Pendente';
        var det = mk('details', { class: 'task' + (done ? ' done' : '') }, [
          mk('summary', {}, [mk('span', { class: 'n', text: t.tool === 'Analytics' ? 'GA' : 'GSC' }), mk('span', {}, [mk('b', { text: t.title }), mk('small', { text: (t.time ? t.time + ' · ' : '') + (done ? nextDue(t) : LABEL[g]) })]), mk('span', { class: 'pill', 'data-s': done ? 'ok' : (notYet || !inWindow) ? 'pending' : 'warning', text: pillTxt })]),
          mk('div', { class: 'body' }, [
            mk('p', { class: 'why', style: 'margin:0', text: t.why }),
            mk('ol', {}, t.steps.map(function (x) { return mk('li', { text: x }); })),
            t.send ? mk('p', { class: 'vnote', text: 'Depois, me mande os prints aqui no chat do Claude: eu analiso e aplico as melhorias no site.' }) : null,
            mk('div', { class: 'acts' }, [mk('a', { class: 'btn go', href: t.link, target: t.link.charAt(0) === '#' ? null : '_blank', rel: 'noopener', text: t.link.charAt(0) === '#' ? 'Abrir a lista do dia' : 'Abrir ' + t.tool }), btn])
          ])
        ]);
        if (!done && !notYet && i === 0) det.open = true;
        return det;
      }));
    });
    var pill = $('ggPill'); if (pill) { pill.dataset.s = pending ? 'warning' : 'ok'; pill.textContent = pending ? pending + ' pendente' + (pending === 1 ? '' : 's') : 'Em dia'; }
    var badge = $('ggBadge'); if (badge) { badge.hidden = !pending; badge.textContent = pending; }
  }
  window.psGscGa = { render: render };
  render();
})();
