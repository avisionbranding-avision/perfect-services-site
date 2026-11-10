// Central do site: "Hoje". What runs by itself and when, what the agency does each day, and a live list of
// everything pending across the other tabs (read from their badges).
(function () {
  var ASSISTANT = 'https://claude.ai/artifact/Ch4LvJS6yD4PMFbveP5ieb';
  var AUTO = {
    site: [
      ['Todo dia, 7h', '32 artigos novos de uma vez (20 de Greer, 2 por serviço, e 12 de outras cidades), com palavras-chave das buscas da região, FAQ e links para a página do serviço na cidade. Publicados juntos na Cloudflare.'],
      ['Todo dia, 7h (mesma publicação)', 'Blog das cidades, FAQ central, sitemap e links internos atualizados. A rotina também aplica até 3 melhorias de conteúdo da aba Melhorias SEO.'],
      ['A cada 3 horas', 'Monitor: saúde do site, links, posição de 6 cidades nas buscas, concorrência, diretórios e novas melhorias de SEO. Correções seguras entram na publicação das 7h.'],
      ['O tempo todo', 'Cada pedido de orçamento vai para o banco de leads e chega por e-mail na Avision na hora.'],
    ],
    gmb: [
      ['Todo dia, 7h', '3 posts estratégicos prontos (1 de Greer e 2 de outras cidades, girando os serviços), com texto, botão, link certo e foto.'],
      ['A cada 3 horas', 'Nota e avaliações do perfil, e novas atualizações sugeridas para o perfil.'],
      ['Quando chega avaliação', 'Resposta de SEO pronta na seção Avaliações.'],
    ],
  };
  var YOU = {
    site: [
      ['Todo dia (2 min)', 'Conferir leads novos e repassar ao Tony', '#leads'],
      ['Todo dia (5 min)', '10 inspeções no Search Console', '#inspecionar'],
      ['Todo dia (2 min)', 'Ver as melhorias marcadas "Você"', '#melhorias-seo'],
      ['Toda segunda (15 min)', 'Prints do Search Console e do Analytics para o Claude', '#google-rotina'],
      ['Esta semana', 'Cadastrar os diretórios com o kit (Bing, Yelp, Angi…)', '#diretorios'],
    ],
    gmb: [
      ['Todo dia (3 min)', 'Publicar os 3 posts do dia e marcar Publicado', '#gmn-posts'],
      ['Quando chega avaliação', 'Responder em até 24 h com a resposta pronta', '#gmn-avaliacoes'],
      ['Toda semana', '2 fotos novas no perfil e 3 pedidos de avaliação por SMS', '#gmn-melhorias'],
    ],
  };
  var PEND = [
    ['leadBadge', 'Leads novos para repassar ao Tony', '#leads'],
    ['seoBadge', 'Melhorias de SEO que dependem de você', '#melhorias-seo'],
    ['ggBadge', 'Rotina do Search Console e do Analytics', '#google-rotina'],
    ['gcBadge', 'Configuração do Google (GA4, GTM, Search Console)', '#google-config'],
    ['gmnBadge', 'Posts do Google Meu Negócio para publicar', '#gmn-posts'],
    ['melBadge', 'Atualizações do perfil no Google', '#gmn-melhorias'],
    ['revBadge', 'Avaliações sem resposta', '#gmn-avaliacoes'],
    ['tecBadge', 'Pontos técnicos (site, Cloudflare, formulário, rotinas)', '#tecnico'],
  ];
  var $ = function (id) { return document.getElementById(id); };
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function autoList(id, rows) {
    var box = $(id); if (!box) return;
    box.replaceChildren.apply(box, rows.map(function (r) { return mk('li', {}, [mk('b', { text: r[0] }), mk('span', { text: r[1] })]); }));
  }
  function youList(id, rows) {
    var box = $(id); if (!box) return;
    box.replaceChildren.apply(box, rows.map(function (r) { return mk('li', {}, [mk('b', { text: r[0] }), mk('span', { text: r[1] }), mk('a', { class: 'btn', href: r[2], text: 'Abrir' })]); }));
  }
  function render() {
    autoList('agAutoSite', AUTO.site); autoList('agAutoGmb', AUTO.gmb);
    youList('agYouSite', YOU.site); youList('agYouGmb', YOU.gmb);
    var box = $('agPend'); if (!box) return;
    var rows = PEND.map(function (m) { var b = $(m[0]); return { n: b && !b.hidden ? Number(b.textContent) || 0 : 0, m: m }; });
    rows.sort(function (a, b) { return (b.n > 0) - (a.n > 0); });
    box.replaceChildren.apply(box, rows.map(function (r) {
      return mk('li', {}, [mk('span', { class: 'pill', 'data-s': r.n ? 'warning' : 'ok', text: r.n ? r.n + ' pendente' + (r.n === 1 ? '' : 's') : 'Em dia' }), mk('span', { text: r.m[1] }), mk('a', { class: 'btn', href: r.m[2], text: 'Abrir' })]);
    }));
    var a = $('agAssistant'); if (a) a.href = ASSISTANT;
  }
  window.psAgenda = { render: render };
  render();
  setInterval(render, 5000);
})();
