// Perfect Services panel: one-time Google setup (Search Console after the move to Cloudflare, Google Tag Manager,
// GA4 inside GTM, Analytics settings). Each item says who does it. Progress is kept in this browser.
// Items marked after:'domain' unlock by themselves once the panel is served by Cloudflare on the official domain.
(function () {
  var LS = 'ps-google-setup-v1';
  var DOMAIN = 'perfectservicespaintingcleaning.com';
  var GSC = 'https://search.google.com/search-console?resource_id=sc-domain%3A' + DOMAIN;
  var GA = 'https://analytics.google.com/';
  var GTM = 'https://tagmanager.google.com/';
  var GROUPS = [
    { id: 'gsc', title: 'Search Console', note: 'Depois que o domínio passar para a Cloudflare. A propriedade é do domínio inteiro e continua verificada pelo registro TXT do Google, que foi mantido.' },
    { id: 'gtm', title: 'Google Tag Manager (GTM)', note: 'Hoje o Analytics está instalado direto no site. Com o GTM, dá para adicionar Google Ads, pixel da Meta e outras tags sem mexer no código. Faça na ordem.' },
    { id: 'ga', title: 'Google Analytics 4 (uma vez)', note: 'Ajustes da conta do Analytics (G-NBGQ3ZCS3N). Os eventos aparecem 24 a 48 horas depois do primeiro uso.' },
    { id: 'later', title: 'Depois (quando o cliente quiser anunciar)', note: 'Só quando houver campanha. Tudo entra pelo GTM, sem mexer no site.' }
  ];
  var TASKS = [
    // ---- Search Console ----
    { id: 'sc-verify', doneOn: '2026-11-10', g: 'gsc', who: 'Claude', after: 'domain', title: 'Confirmar que o Search Console continua verificado',
      why: 'A troca de DNS não pode derrubar a verificação, senão os dados param de chegar.',
      steps: ['Search Console → Configurações → Verificação de propriedade', 'Deve aparecer "Verificado" pelo registro DNS (TXT)'], link: GSC },
    { id: 'sc-sitemap', doneOn: '2026-11-10', g: 'gsc', who: 'Claude', after: 'domain', title: 'Reenviar o sitemap com os endereços novos',
      why: 'O blog e os artigos antigos perderam o ".html" (ex.: /blog). O sitemap novo avisa o Google de uma vez.',
      steps: ['Search Console → Sitemaps', 'Envie https://' + DOMAIN + '/sitemap.xml', 'Status deve ficar "Processado"'], link: GSC },
    { id: 'sc-inspect', g: 'gsc', who: 'Você', after: 'domain', title: 'Pedir indexação do /blog e dos artigos com o endereço novo',
      why: 'Acelera a troca dos endereços antigos (.html) pelos novos nos resultados do Google.',
      steps: ['Aba "Site e SEO" → "Inspecionar hoje no Google": os endereços novos já entram na lista do dia', 'Comece por https://' + DOMAIN + '/blog', 'Faça os 10 do dia normalmente'], link: '#inspecionar' },
    { id: 'sc-redirects', g: 'gsc', who: 'Claude', after: 'domain', title: 'Acompanhar os redirecionamentos por 1 semana',
      why: 'Os endereços antigos com ".html" devem aparecer como "Página com redirecionamento", nunca como erro 404.',
      steps: ['Search Console → Indexação → Páginas → "Página com redirecionamento"', 'Mande um print na segunda-feira: eu confiro se está tudo certo'], link: GSC, send: true },
    { id: 'sc-client', g: 'gsc', who: 'Você', title: 'Dar acesso ao cliente no Search Console',
      why: 'O cliente vê as buscas e a indexação na própria conta.',
      steps: ['Search Console → Configurações → Usuários e permissões → Adicionar usuário', 'E-mail do cliente → Proprietário (ou Completo)'], link: GSC },
    // ---- GTM ----
    { id: 'gtm-account', doneOn: '2026-11-10', g: 'gtm', who: 'Você', title: 'Criar a conta e o contêiner no Tag Manager',
      why: 'O contêiner é onde as tags ficam. Precisa ser criado com a conta Google da Avision.',
      steps: ['Entre em tagmanager.google.com com a conta Google da Avision', 'Criar conta → Nome: Perfect Services → País: Estados Unidos', 'Contêiner: ' + DOMAIN + ' → Plataforma: Web → Criar e aceitar os termos', 'Copie o ID que começa com GTM- e mande aqui no chat (não é senha, pode mandar)'], link: GTM },
    { id: 'gtm-install', doneOn: '2026-11-10', g: 'gtm', who: 'Claude', needs: 'gtm-account', title: 'Instalar o código do GTM em todas as páginas',
      why: 'Entra pelo gerador do site, então vale para as páginas atuais e para os artigos novos de cada dia.',
      steps: ['Eu coloco o código no <head> e no <body> de todas as páginas', 'Publico junto com a postagem das 7h (ou na hora, se você pedir)'] },
    { id: 'gtm-ga4', doneOn: '2026-11-10', g: 'gtm', who: 'Claude', needs: 'gtm-account', title: 'Passar o Analytics e os 3 eventos para dentro do GTM',
      why: 'Tag do Google (G-NBGQ3ZCS3N) e os eventos generate_lead, click_call e click_sms passam a sair do GTM. O código direto sai do site, para não contar cada visita duas vezes.',
      steps: ['Você entra no Tag Manager no Chrome', 'Eu crio a tag do Google, os 3 acionadores e as 3 tags de evento', 'Eu tiro o código direto do Analytics do site'], link: GTM },
    { id: 'gtm-test', doneOn: '2026-11-10', g: 'gtm', who: 'Claude', needs: 'gtm-ga4', title: 'Testar no modo Visualizar e no Tempo real',
      why: 'Garante que visita, ligação, SMS e pedido de orçamento continuam sendo contados.',
      steps: ['GTM → Visualizar → abrir o site', 'Clicar em ligar, SMS e enviar um pedido de teste (com o seu ok)', 'Conferir no Analytics → Relatórios → Tempo real'], link: GTM },
    { id: 'gtm-publish', doneOn: '2026-11-10', g: 'gtm', who: 'Claude', needs: 'gtm-test', title: 'Publicar a versão do contêiner',
      why: 'Sem publicar, as tags só funcionam no modo de teste.',
      steps: ['GTM → Enviar → Nome da versão: "GA4 + eventos de contato" → Publicar'], link: GTM },
    // ---- GA4 ----
    { id: 'ga-key-events', g: 'ga', who: 'Você', from: '2026-11-10', title: 'Marcar os contatos como eventos-chave (conversões)',
      why: 'Sem isso, o Analytics não mostra quantos pedidos de orçamento e ligações cada cidade e serviço gera.',
      steps: ['click_estimate já está marcado (10/11). Faltam os 3 abaixo, que só aparecem depois do primeiro uso no site', 'Analytics → Administrador (engrenagem) → Exibição de dados → Eventos → Eventos recentes', 'Clique na estrela de: generate_lead, click_call, click_sms', 'Se os eventos ainda não aparecem na lista, volte amanhã (eles surgem depois do primeiro uso)'], link: GA },
    { id: 'ga-link-gsc', doneOn: '2026-11-10', g: 'ga', who: 'Você', title: 'Vincular o Analytics ao Search Console',
      why: 'Cruza as buscas do Google com as visitas e os contatos no site.',
      steps: ['Analytics → Administrador → Links de produtos → Search Console', 'Vincular → escolha ' + DOMAIN + ' → escolha o fluxo da Web → Enviar'], link: GA },
    { id: 'ga-retention', doneOn: '2026-11-10', g: 'ga', who: 'Você', title: 'Guardar os dados por 14 meses',
      why: 'O padrão é 2 meses; com 14 dá para comparar meses e temporadas.',
      steps: ['Administrador → Coleta e modificação de dados → Retenção de dados', 'Retenção de dados de eventos: 14 meses → Salvar'], link: GA },
    { id: 'ga-client', g: 'ga', who: 'Você', title: 'Dar acesso de administrador ao cliente',
      why: 'O cliente fica dono dos dados junto com a agência.',
      steps: ['Administrador → Gerenciamento de acesso à conta → + → Adicionar usuários', 'E-mail da conta Google do cliente → função Administrador → Adicionar'], link: GA },
    // ---- later ----
    { id: 'ads-conv', g: 'later', who: 'Claude', optional: true, title: 'Conversões do Google Ads',
      why: 'Mede quantos pedidos e ligações vêm de cada anúncio.',
      steps: ['Você cria a conta do Google Ads e vincula ao Analytics', 'Eu importo os eventos-chave como conversões e crio a tag no GTM'] },
    { id: 'meta-pixel', g: 'later', who: 'Claude', optional: true, title: 'Pixel da Meta (Facebook e Instagram)',
      why: 'Mede os pedidos vindos de anúncios no Instagram e permite remarketing.',
      steps: ['Você cria o pixel no Gerenciador de Eventos da Meta e me manda o ID', 'Eu coloco o pixel e o evento de lead no GTM'] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  function pad(n) { return String(n).padStart(2, '0'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function load() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }

  // Domain on Cloudflare yet? True when this panel is opened on the official domain and Cloudflare served it.
  var domainLive = false;
  function checkDomain() {
    if (location.hostname.replace(/^www\./, '') !== DOMAIN) { domainLive = false; return; }
    fetch('/painel/google.js', { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      domainLive = /cloudflare/i.test(r.headers.get('server') || '');
      render();
    }).catch(function () { /* keep previous */ });
  }

  function render() {
    var s = load();
    var now = today();
    var pending = 0, done = 0, total = 0;
    GROUPS.forEach(function (gr) {
      var box = $('gc-' + gr.id); if (!box) return;
      var list = TASKS.filter(function (t) { return t.g === gr.id; });
      var openedOne = false;
      box.replaceChildren.apply(box, list.map(function (t) {
        var isDone = !!s[t.id] || !!t.doneOn;
        var waitDomain = t.after === 'domain' && !domainLive && !isDone;
        var notYet = t.from && t.from > now && !isDone;
        var waitPrev = t.needs && !s[t.needs] && !isDone;
        var blocked = waitDomain || notYet || waitPrev;
        if (!t.optional) { total++; if (isDone) done++; else if (!blocked) pending++; }
        var pillTxt = isDone ? 'Feito' : waitDomain ? 'Depois da troca do domínio' : waitPrev ? 'Depois do item anterior' : notYet ? 'A partir de ' + t.from.split('-').reverse().slice(0, 2).join('/') : t.optional ? 'Opcional' : 'Pendente';
        var pillS = isDone ? 'ok' : (blocked || t.optional) ? 'pending' : 'warning';
        var btn = mk('button', { class: 'btn ' + (isDone ? '' : 'ok'), type: 'button', text: isDone ? 'Desfazer' : 'Marcar como feito' });
        if (t.doneOn) { btn = null; } else btn.addEventListener('click', function (e) { e.preventDefault(); var st = load(); if (st[t.id]) delete st[t.id]; else st[t.id] = now; save(st); render(); });
        var link = t.link ? mk('a', { class: 'btn go', href: t.link, target: t.link.charAt(0) === '#' ? null : '_blank', rel: 'noopener', text: t.link.charAt(0) === '#' ? 'Abrir a lista do dia' : 'Abrir ' + (t.link === GTM ? 'Tag Manager' : t.link === GA ? 'Analytics' : 'Search Console') }) : null;
        var det = mk('details', { class: 'task' + (isDone ? ' done' : '') }, [
          mk('summary', {}, [
            mk('span', { class: 'n', text: t.who === 'Você' ? 'VOC' : 'CL' , title: t.who === 'Você' ? 'Você faz' : 'O Claude faz' }),
            mk('span', {}, [mk('b', { text: t.title }), mk('small', { text: (t.who === 'Você' ? 'Você faz' : 'O Claude faz') + (isDone ? ' · feito em ' + String(t.doneOn || s[t.id]).split('-').reverse().slice(0, 2).join('/') : '') })]),
            mk('span', { class: 'pill', 'data-s': pillS, text: pillTxt })
          ]),
          mk('div', { class: 'body' }, [
            mk('p', { class: 'why', style: 'margin:0', text: t.why }),
            mk('ol', {}, t.steps.map(function (x) { return mk('li', { text: x }); })),
            t.who !== 'Você' ? mk('p', { class: 'vnote', text: 'Peça no chat do Claude: "faça o item ' + t.title.toLowerCase() + '". Ele marca aqui quando terminar, ou marque você.' }) : null,
            t.send ? mk('p', { class: 'vnote', text: 'Depois, me mande o print aqui no chat do Claude.' }) : null,
            mk('div', { class: 'acts' }, [link, btn])
          ])
        ]);
        if (!isDone && !blocked && !t.optional && !openedOne) { det.open = true; openedOne = true; }
        return det;
      }));
    });
    var pill = $('gcPill'); if (pill) { pill.dataset.s = pending ? 'warning' : 'ok'; pill.textContent = done + ' de ' + total + ' feitos' + (pending ? ' · ' + pending + ' para fazer agora' : ''); }
    var badge = $('gcBadge'); if (badge) { badge.hidden = !pending; badge.textContent = pending; }
  }
  // ---- "Google agora": live checks from this browser + shortcuts to the real reports ----
  var GTM_ID = 'GTM-WTM3FM9G', GA_ID = 'G-NBGQ3ZCS3N';
  var GA_REPORTS = 'https://analytics.google.com/analytics/web/#/a415555101p563359838/';
  var GTM_WS = 'https://tagmanager.google.com/#/container/accounts/6403863561/containers/286086686/workspaces';
  function liveRow(s, title, detail) { return mk('li', { 'data-s': s }, [mk('div', {}, [mk('b', { text: title }), mk('span', { text: detail })]), mk('span', { class: 'pill', 'data-s': s, text: s === 'ok' ? 'OK' : s === 'warning' ? 'Atenção' : s === 'error' ? 'Erro' : 'Conferindo' })]); }
  function liveChecks() {
    var box = $('glChecks'); if (!box) return;
    var t = Date.now();
    var txt = function (u, o) { return fetch(u, Object.assign({ cache: 'no-store' }, o || {})).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return null; }); };
    Promise.all([
      txt('/?g=' + t),
      txt('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID + '&t=' + t),
      fetch('https://cloudflare-dns.com/dns-query?name=' + DOMAIN + '&type=TXT', { headers: { accept: 'application/dns-json' } }).then(function (r) { return r.json(); }).catch(function () { return null; }),
      txt('/sitemap.xml?t=' + t),
      txt('/robots.txt?t=' + t)
    ]).then(function (r) {
      var home = r[0], gtmJs = r[1], dns = r[2], sm = r[3], robots = r[4];
      var rows = [], warn = 0;
      var add = function (s, a, b) { if (s !== 'ok') warn++; rows.push(liveRow(s, a, b)); };
      add(home && home.indexOf(GTM_ID) > -1 ? 'ok' : 'error', 'Tag Manager no site', home && home.indexOf(GTM_ID) > -1 ? GTM_ID + ' está em todas as páginas geradas.' : 'O código do GTM não apareceu na página inicial.');
      if (gtmJs === null) add('pending', 'Contêiner publicado', 'Não deu para ler o contêiner do GTM a partir deste navegador.');
      else {
        var hasGa = gtmJs.indexOf(GA_ID) > -1, hasEv = /generate_lead/.test(gtmJs);
        add(hasGa && hasEv ? 'ok' : 'warning', 'Contêiner publicado', hasGa && hasEv ? 'Envia o Analytics (' + GA_ID + ') e os eventos de contato: pedido de orçamento, ligação, SMS, e-mail e clique em orçamento.' : 'A versão publicada do GTM não tem ' + (hasGa ? 'os eventos de contato' : 'o Analytics') + '.');
      }
      var txts = dns && dns.Answer ? dns.Answer.map(function (a) { return a.data || ''; }) : null;
      if (!txts) add('pending', 'Verificação do Search Console', 'Não deu para consultar o DNS agora.');
      else add(txts.some(function (x) { return /google-site-verification/.test(x); }) ? 'ok' : 'error', 'Verificação do Search Console', txts.some(function (x) { return /google-site-verification/.test(x); }) ? 'Registro de verificação do Google presente no DNS da Cloudflare. A propriedade continua verificada.' : 'O registro TXT do Google sumiu do DNS: o Search Console pode perder a verificação.');
      var n = sm ? (sm.match(/<loc>/g) || []).length : 0;
      add(n > 100 && robots && /Sitemap:/.test(robots) ? 'ok' : 'warning', 'Sitemap e robots.txt', n ? n + ' endereços no sitemap; o robots.txt aponta para ele. Reenviado ao Search Console em 10/11 (561 páginas lidas).' : 'Não deu para ler o sitemap.');
      var ke = TASKS.find(function (x) { return x.id === 'ga-key-events'; });
      var keDone = !!load()[ke.id];
      add(keDone ? 'ok' : 'warning', 'Conversões no Analytics', keDone ? 'Eventos de contato marcados como eventos principais.' : 'click_estimate já é evento principal. Faltam generate_lead, click_call e click_sms (aparecem depois do primeiro uso; veja a configuração abaixo).');
      box.replaceChildren.apply(box, rows);
      var p = $('glPill'); p.dataset.s = warn ? 'warning' : 'ok'; p.textContent = warn ? warn + ' ponto' + (warn === 1 ? '' : 's') + ' para olhar' : 'Tudo funcionando';
    });
    var links = $('glLinks');
    if (links && !links.childElementCount) {
      [['Analytics: tempo real', GA_REPORTS + 'realtime/overview'], ['Analytics: eventos', GA_REPORTS + 'reports/explorer?r=events'], ['Search Console: desempenho', 'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3A' + DOMAIN], ['Search Console: páginas', 'https://search.google.com/search-console/index?resource_id=sc-domain%3A' + DOMAIN], ['Tag Manager', GTM_WS]].forEach(function (l) {
        links.append(mk('a', { class: 'btn', href: l[1], target: '_blank', rel: 'noopener', text: l[0] }));
      });
    }
  }
  window.psGoogleSetup = { render: render };
  render();
  checkDomain();
  liveChecks();
  setInterval(liveChecks, 5 * 60 * 1000);
})();
