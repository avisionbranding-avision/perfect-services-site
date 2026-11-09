// Perfect Services panel: SEO schedule (what runs by itself vs what the owner does), for the site and the
// Google Business Profile, plus a live count of Search Console & Analytics tasks and the AI assistant link.
(function () {
  var ASSISTANT = 'https://claude.ai/artifact/Ch4LvJS6yD4PMFbveP5ieb';
  var AUTO = {
    site: [
      ['Todo dia, 9h e 17h', '16 artigos por execução (32/dia): 10 de Greer, um por serviço, e 6 de outras cidades, com palavras-chave das buscas da região, FAQ e links para a página do serviço na cidade.'],
      ['Todo dia, a cada publicação', 'Blog das cidades, FAQ central, sitemap e links internos atualizados sozinhos.'],
      ['A cada 3 horas', 'Monitor: saúde do site, links quebrados, correções seguras, posição de 6 cidades nas buscas e cadastros em diretórios.'],
      ['Toda segunda', 'Com os prints que você manda do Search Console e do Analytics: reforço das páginas entre a posição 8 e 20 e ajuste dos temas dos artigos.'],
    ],
    gmb: [
      ['Todo dia, 9h', '3 posts prontos (1 de Greer + 2 de outras cidades), com texto, botão, link da página certa e foto.'],
      ['A cada 3 horas', 'Nota e avaliações do perfil, e novas sugestões de melhoria na aba Melhorias Google.'],
      ['Quando chega avaliação', 'Resposta de SEO pronta na aba Avaliações (automático pelo Gmail quando você autorizar).'],
    ],
  };
  var YOU = {
    site: [
      ['Todo dia (5 min)', '10 inspeções no Search Console', '#inspecionar'],
      ['Todo dia (3 min)', 'Conferir pedidos de orçamento e ligações de ontem no Analytics', '#gscga'],
      ['Toda segunda (15 min)', 'Prints do Search Console e do Analytics para o Claude', '#gscga'],
      ['Esta semana', 'Cadastrar Bing, Yelp e Angi com o kit (depois os outros)', '#diretorios'],
    ],
    gmb: [
      ['Todo dia (3 min)', 'Publicar os 3 posts do dia e marcar Publicado', '#gmn'],
      ['Quando chega avaliação', 'Gerar a resposta e responder em até 24 h', '#avaliacoes'],
      ['Toda semana', '2 fotos novas no perfil e 3 pedidos de avaliação por SMS', '#melhorias'],
      ['Uma vez (hoje)', 'Configuração do perfil: categorias, 20 cidades, serviços, telefone (864) 399-5168, Instagram, endereço', '#melhorias'],
    ],
  };
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
    // live pending counts from the other tabs' badges
    var map = [['ggBadge', 'Search Console & Analytics', '#gscga'], ['melBadge', 'Melhorias Google', '#melhorias'], ['gmnBadge', 'Posts do Google Meu Negócio', '#gmn'], ['revBadge', 'Avaliações sem resposta', '#avaliacoes']];
    var box = $('agPend'); if (!box) return;
    box.replaceChildren.apply(box, map.map(function (m) {
      var b = $(m[0]); var n = b && !b.hidden ? Number(b.textContent) || 0 : 0;
      return mk('li', {}, [mk('span', { class: 'pill', 'data-s': n ? 'warning' : 'ok', text: n ? n + ' pendente' + (n === 1 ? '' : 's') : 'Em dia' }), mk('span', { text: m[1] }), mk('a', { class: 'btn', href: m[2], text: 'Abrir' })]);
    }));
    var a = $('agAssistant'); if (a) a.href = ASSISTANT;
  }
  window.psAgenda = { render: render };
  render();
  setInterval(render, 5000);
})();
