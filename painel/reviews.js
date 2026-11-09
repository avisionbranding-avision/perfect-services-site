// Perfect Services panel: Google review status + strategic reply generator.
// Runs in the browser only. Replies are built from the review's own words, the star rating,
// the service and the city, with one natural mention of service + city on positive reviews.
(function () {
  var PHONE = '(864) 399-5168';
  var SIGN = { en: '– Regiani & Tony, Perfect Services', es: '– Regiani y Tony, Perfect Services', pt: '– Regiani e Tony, Perfect Services' };
  var SERVICES = [
    { slug: 'house-cleaning', en: 'house cleaning', es: 'limpieza de casa', pt: 'limpeza da casa', kw: ['house cleaning', 'maid', 'housekeeping', 'regular', 'weekly', 'biweekly', 'every two weeks', 'monthly', 'recurring'] },
    { slug: 'deep-cleaning', en: 'deep cleaning', es: 'limpieza profunda', pt: 'limpeza profunda', kw: ['deep clean', 'deep cleaning', 'top to bottom', 'baseboard', 'grout', 'spring clean'] },
    { slug: 'move-in-move-out-cleaning', en: 'move-out cleaning', es: 'limpieza de mudanza', pt: 'limpeza de mudança', kw: ['move out', 'move-out', 'move in', 'move-in', 'moving', 'deposit', 'landlord', 'lease', 'walkthrough'] },
    { slug: 'post-construction-cleaning', en: 'post-construction cleaning', es: 'limpieza post-construcción', pt: 'limpeza pós-obra', kw: ['construction', 'remodel', 'renovation', 'builder', 'dust', 'new build'] },
    { slug: 'commercial-office-cleaning', en: 'office cleaning', es: 'limpieza de oficina', pt: 'limpeza de escritório', kw: ['office', 'business', 'commercial', 'store', 'shop', 'clinic'] },
    { slug: 'brazilian-house-cleaning', en: 'Brazilian house cleaning', es: 'limpieza al estilo brasileño', pt: 'limpeza no estilo brasileiro', kw: ['brazilian', 'brazil'] },
    { slug: 'airbnb-vacation-rental-cleaning', en: 'Airbnb turnover cleaning', es: 'limpieza de Airbnb', pt: 'limpeza de Airbnb', kw: ['airbnb', 'vrbo', 'rental', 'guests', 'turnover', 'host'] },
    { slug: 'apartment-condo-cleaning', en: 'apartment cleaning', es: 'limpieza de apartamento', pt: 'limpeza de apartamento', kw: ['apartment', 'condo', 'townhome', 'townhouse', 'studio'] },
    { slug: 'one-time-cleaning', en: 'one-time cleaning', es: 'limpieza única', pt: 'limpeza avulsa', kw: ['one time', 'one-time', 'party', 'event', 'holiday', 'last minute', 'before guests'] },
    { slug: 'eco-friendly-green-cleaning', en: 'eco-friendly cleaning', es: 'limpieza ecológica', pt: 'limpeza ecológica', kw: ['eco', 'green', 'non toxic', 'non-toxic', 'natural', 'pet safe', 'pet-safe', 'chemical'] }
  ];
  var TOPICS = [
    { id: 'detail', label: 'Atenção aos detalhes', kw: ['detail', 'corner', 'baseboard', 'thorough', 'spotless', 'every inch', 'meticulous', 'detalle', 'detalhe', 'impecable', 'impecável'],
      en: ['We love that the details stood out. Corners, edges and baseboards are exactly where our detail-first Brazilian method makes the difference.', 'The little things are what we care about most, and that hands-on attention to detail is how we clean every home.'],
      es: ['Nos alegra que notara los detalles. Esquinas y zócalos son justo donde nuestro método brasileño hace la diferencia.'],
      pt: ['Que bom que os detalhes chamaram atenção. Cantos e rodapés são justamente onde o nosso método brasileiro faz diferença.'] },
    { id: 'punctual', label: 'Pontualidade', kw: ['on time', 'punctual', 'early', 'reliable', 'showed up', 'puntual', 'pontual'],
      en: ['Being on time and reliable matters a lot to us, so it means a lot that you noticed.'], es: ['Ser puntuales y confiables es muy importante para nosotros.'], pt: ['Chegar no horário e ser de confiança é muito importante para nós.'] },
    { id: 'team', label: 'Equipe simpática / profissional', kw: ['friendly', 'kind', 'sweet', 'professional', 'polite', 'respectful', 'nice', 'amable', 'profesional', 'simpátic', 'educad'],
      en: ['We will share your kind words with the whole team.', 'Our team will be so happy to read this.'], es: ['Compartiremos sus amables palabras con todo el equipo.'], pt: ['Vamos compartilhar suas palavras com toda a equipe.'] },
    { id: 'referral', label: 'Indicação / recomenda', kw: ['recommend', 'neighbor', 'friend', 'referr', 'recomiendo', 'recomendo', 'indico', 'vecin', 'vizinh'],
      en: ['Referrals from neighbors are the biggest compliment a local business can get, and we are grateful you recommend us.'], es: ['Las recomendaciones de vecinos son el mayor halago para un negocio local. ¡Gracias por recomendarnos!'], pt: ['Indicação de vizinho é o maior elogio para uma empresa local. Obrigado por nos recomendar!'] },
    { id: 'fresh', label: 'Casa cheirosa / sensação', kw: ['smell', 'fresh', 'felt like', 'new home', 'hotel', 'relax', 'peace', 'huele', 'cheiro', 'cheiros'],
      en: ['There is nothing like walking into a fresh, clean home after a long day.'], es: ['No hay nada como llegar a una casa limpia y fresca después de un largo día.'], pt: ['Nada como chegar em uma casa limpa e cheirosa depois de um dia longo.'] },
    { id: 'value', label: 'Preço / custo-benefício', kw: ['price', 'value', 'worth', 'affordable', 'reasonable', 'precio', 'preço', 'vale'],
      en: ['We are glad you felt the result was worth it.'], es: ['Nos alegra que el resultado valiera la pena.'], pt: ['Ficamos felizes que o resultado valeu a pena.'] },
    { id: 'communication', label: 'Comunicação / agendamento', kw: ['communicat', 'respons', 'text', 'quick', 'easy to book', 'schedul', 'flexible', 'comunic', 'agend'],
      en: ['We try to make booking as easy as the cleaning is thorough, so thank you for mentioning it.'], es: ['Intentamos que agendar sea tan fácil como impecable es la limpieza.'], pt: ['Tentamos deixar o agendamento tão fácil quanto a limpeza é caprichada.'] }
  ];
  // SEO: keyword variants per service (rotated so replies don't repeat the same phrase) and the service
  // that naturally goes with it (a second, related keyword that links the profile to more searches).
  var ALT = {
    'house-cleaning': ['house cleaning', 'maid service', 'recurring house cleaning'],
    'deep-cleaning': ['deep cleaning', 'deep house cleaning', 'top-to-bottom deep clean'],
    'move-in-move-out-cleaning': ['move-out cleaning', 'move-in cleaning', 'end-of-lease cleaning'],
    'post-construction-cleaning': ['post-construction cleaning', 'post-renovation cleanup'],
    'commercial-office-cleaning': ['office cleaning', 'commercial cleaning'],
    'brazilian-house-cleaning': ['Brazilian house cleaning', 'Brazilian-style cleaning'],
    'airbnb-vacation-rental-cleaning': ['Airbnb turnover cleaning', 'vacation rental cleaning'],
    'apartment-condo-cleaning': ['apartment cleaning', 'condo cleaning'],
    'one-time-cleaning': ['one-time cleaning', 'one-time house cleaning'],
    'eco-friendly-green-cleaning': ['eco-friendly cleaning', 'green cleaning']
  };
  var PAIR = {
    'house-cleaning': 'deep-cleaning', 'deep-cleaning': 'house-cleaning', 'move-in-move-out-cleaning': 'deep-cleaning',
    'post-construction-cleaning': 'deep-cleaning', 'commercial-office-cleaning': 'post-construction-cleaning',
    'brazilian-house-cleaning': 'deep-cleaning', 'airbnb-vacation-rental-cleaning': 'deep-cleaning',
    'apartment-condo-cleaning': 'move-in-move-out-cleaning', 'one-time-cleaning': 'house-cleaning', 'eco-friendly-green-cleaning': 'house-cleaning'
  };
  var NEG = ['late', 'missed', 'broke', 'damage', 'rude', 'dirty', 'not clean', 'disappoint', 'never', 'refund', 'complain', 'worst', 'terrible', 'poor', 'unprofessional', 'forgot', 'skipped'];

  var $ = function (id) { return document.getElementById(id); };
  var seed = 0;
  var pick = function (arr, k) { return arr[(seed + (k || 0)) % arr.length]; };
  var low = function (s) { return String(s || '').toLowerCase(); };
  var first = function (n) { var f = String(n || '').trim().split(/\s+/)[0] || ''; return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ''; };

  function detectLang(t) {
    var s = low(t);
    if (/[ãõç]|\b(obrigad|ótimo|otimo|muito|serviço|recomendo|limpeza)\b/.test(s)) return 'pt';
    if (/[ñ¡¿]|\b(excelente trabajo|gracias|muy|limpieza|trabajo|servicio|recomiendo)\b/.test(s)) return 'es';
    return 'en';
  }
  function detectService(t) { var s = low(t); for (var i = 0; i < SERVICES.length; i++) for (var j = 0; j < SERVICES[i].kw.length; j++) if (s.indexOf(SERVICES[i].kw[j]) >= 0) return SERVICES[i].slug; return ''; }
  function detectCity(t, cities) { var s = low(t); for (var i = 0; i < cities.length; i++) if (s.indexOf(low(cities[i].name)) >= 0) return cities[i].slug; return ''; }
  function topicsOf(t) { var s = low(t); return TOPICS.filter(function (tp) { return tp.kw.some(function (k) { return s.indexOf(k) >= 0; }); }); }

  function build(input, cities) {
    var name = first(input.name);
    var stars = Number(input.stars);
    var lang = input.lang === 'auto' ? detectLang(input.text) : input.lang;
    var svc = SERVICES.filter(function (x) { return x.slug === input.service; })[0];
    var city = cities.filter(function (c) { return c.slug === input.city; })[0];
    var topics = topicsOf(input.text);
    var negWords = NEG.filter(function (w) { return low(input.text).indexOf(w) >= 0; });
    var hi = name ? name : '';
    var parts = [];
    var svcTxt = svc ? (lang === 'en' ? pick(ALT[svc.slug] || [svc.en]) : svc[lang]) : null;
    var place = city ? city.name : null;
    var pairSvc = svc && PAIR[svc.slug] ? SERVICES.filter(function (x) { return x.slug === PAIR[svc.slug]; })[0] : null;
    var pairTxt = pairSvc ? (lang === 'en' ? pick(ALT[pairSvc.slug] || [pairSvc.en], 1) : pairSvc[lang]) : null;

    if (stars >= 4 && !negWords.length) {
      var open = {
        en: [hi ? 'Thank you so much, ' + hi + '!' : 'Thank you so much!', hi ? hi + ', thank you for taking the time to share this!' : 'Thank you for taking the time to share this!', hi ? 'What a kind review, ' + hi + '. Thank you!' : 'What a kind review. Thank you!'],
        es: [hi ? '¡Muchísimas gracias, ' + hi + '!' : '¡Muchísimas gracias!', hi ? hi + ', ¡gracias por tomarse el tiempo de escribirnos!' : '¡Gracias por tomarse el tiempo de escribirnos!'],
        pt: [hi ? 'Muito obrigado, ' + hi + '!' : 'Muito obrigado!', hi ? hi + ', obrigado por tirar um tempo para escrever!' : 'Obrigado por tirar um tempo para escrever!']
      }[lang];
      parts.push(pick(open));
      topics.slice(0, 2).forEach(function (tp, i) { parts.push(pick(tp[lang], i + 1)); });
      if (!topics.length) parts.push({ en: 'It was a pleasure taking care of your home.', es: 'Fue un placer cuidar de su hogar.', pt: 'Foi um prazer cuidar da sua casa.' }[lang]);
      if (svcTxt && place) {
        parts.push(pick({
          en: ['We loved doing your ' + svcTxt + ' in ' + place + '.', 'Thank you for trusting Perfect Services with your ' + svcTxt + ' in ' + place + '.', 'It was a pleasure providing ' + svcTxt + ' for your ' + place + ' home.'],
          es: ['Nos encantó hacer su ' + svcTxt + ' en ' + place + '.', 'Gracias por confiar en Perfect Services para su ' + svcTxt + ' en ' + place + '.'],
          pt: ['Adoramos fazer a ' + svcTxt + ' na sua casa em ' + place + '.', 'Obrigado por confiar na Perfect Services para a ' + svcTxt + ' em ' + place + '.']
        }[lang], 2));
      } else if (svcTxt) {
        parts.push({ en: 'Thank you for trusting Perfect Services with your ' + svcTxt + '.', es: 'Gracias por confiar en Perfect Services para su ' + svcTxt + '.', pt: 'Obrigado por confiar na Perfect Services para a ' + svcTxt + '.' }[lang]);
      } else if (place) {
        parts.push({ en: 'Thank you for trusting Perfect Services with your home in ' + place + '.', es: 'Gracias por confiar en Perfect Services para su hogar en ' + place + '.', pt: 'Obrigado por confiar na Perfect Services para a sua casa em ' + place + '.' }[lang]);
      }
      if (pairTxt && place) {
        parts.push(pick({
          en: ['Many ' + place + ' clients pair it with ' + pairTxt + ' to keep their home fresh between visits.', 'If you ever need ' + pairTxt + ', our team covers ' + place + ' and the rest of the Upstate.'],
          es: ['Si alguna vez necesita ' + pairTxt + ', también atendemos ' + place + ' y todo el Upstate.'],
          pt: ['Se precisar de ' + pairTxt + ', também atendemos ' + place + ' e toda a região do Upstate.']
        }[lang], 1));
      }
      if (stars === 4) parts.push({ en: 'If there is anything we can do to make the next visit a 5-star one, just let us know.', es: 'Si hay algo que podamos mejorar para que la próxima visita sea de 5 estrellas, díganos.', pt: 'Se houver algo que possamos melhorar para a próxima visita ser 5 estrelas, é só nos avisar.' }[lang]);
      parts.push(pick({
        en: ['Whenever you need us again, we are just a text away.', place ? 'We look forward to keeping your ' + place + ' home spotless.' : 'We look forward to seeing you again soon.', 'See you at the next visit!'],
        es: ['Cuando nos necesite de nuevo, estamos a un mensaje de distancia.', '¡Nos vemos en la próxima visita!'],
        pt: ['Quando precisar de novo, é só mandar uma mensagem.', 'Até a próxima visita!']
      }[lang], 3));
    } else {
      // 1-3 stars, or negative words: no keywords, empathy, take it offline
      var nm = hi ? ', ' + hi : '';
      parts.push({ en: 'Thank you for your honest feedback' + nm + '.', es: 'Gracias por su comentario sincero' + nm + '.', pt: 'Obrigado pelo seu comentário sincero' + nm + '.' }[lang]);
      parts.push(pick({
        en: ['We are sorry this visit did not meet the standard we hold ourselves to.', 'We are truly sorry your experience was not what you expected from us.'],
        es: ['Lamentamos que esta visita no estuviera a la altura de nuestro estándar.'],
        pt: ['Lamentamos que esta visita não tenha ficado no padrão que buscamos.']
      }[lang]));
      parts.push({ en: 'We would like to understand what happened and make it right. Please call or text us at ' + PHONE + ' so we can talk directly.', es: 'Queremos entender qué pasó y solucionarlo. Llámenos o escríbanos al ' + PHONE + '.', pt: 'Queremos entender o que aconteceu e resolver. Ligue ou mande mensagem para ' + PHONE + '.' }[lang]);
    }
    parts.push(SIGN[lang]);
    var reply = parts.join(lang === 'en' ? ' ' : ' ').replace(' ' + SIGN[lang], '\n\n' + SIGN[lang]);

    var sentiment = stars >= 4 && !negWords.length ? 'Positiva' : stars === 3 ? 'Neutra / atenção' : 'Negativa: prioridade';
    var analysis = [
      ['Sentimento', sentiment + ' (' + stars + '★)'],
      ['Idioma', { en: 'Inglês', es: 'Espanhol', pt: 'Português' }[lang]],
      ['O cliente destacou', topics.length ? topics.map(function (t) { return t.label; }).join(', ') : (input.text.trim() ? 'Elogio geral' : 'Só estrelas, sem texto')],
      ['Serviço', svc ? svc.en + (input.serviceAuto ? ' (detectado no texto)' : '') : 'Não informado'],
      ['Cidade', city ? city.name + ', ' + city.st + (input.cityAuto ? ' (detectada no texto)' : '') : 'Não informada'],
      ['Palavra-chave usada', !(stars >= 4 && !negWords.length) ? 'Nenhuma (de propósito, em avaliação negativa)' : (svcTxt || place) ? [svcTxt, place].filter(Boolean).join(' + ') : 'Nenhuma: escolha o serviço e a cidade para incluir']
    ];
    if (negWords.length) analysis.push(['Pontos de atenção', negWords.join(', ')]);
    var words = reply.split(/\s+/).length;
    var positive = stars >= 4 && !negWords.length;
    var checks = positive ? [
      ['Agradece pelo nome', !!name],
      ['Cita o que o cliente elogiou', topics.length > 0],
      ['Palavra-chave do serviço', !!svcTxt],
      ['Cidade (busca local)', !!place],
      ['Serviço complementar (2ª palavra-chave)', !!(pairTxt && place)],
      ['Tamanho ideal (40 a 120 palavras)', words >= 40 && words <= 120]
    ] : [
      ['Agradece e reconhece o problema', true],
      ['Leva a conversa para o telefone', true],
      ['Sem palavra-chave (protege a marca)', true],
      ['Tom calmo, sem se defender', true]
    ];
    var okN = checks.filter(function (c) { return c[1]; }).length;
    var miss = checks.filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; });
    analysis.push(['Nota de SEO', okN + '/' + checks.length + (miss.length ? ' · falta: ' + miss.join(', ') : ' · completa')]);
    var tip = stars >= 4 && !negWords.length
      ? (svc && city ? 'Boa avaliação para SEO: a resposta liga "' + svc.en + '" a "' + city.name + '". Publique hoje.' : 'Escolha o serviço e a cidade para a resposta reforçar a busca local.')
      : 'Responda hoje, com calma. Depois ligue para o cliente. Uma avaliação negativa bem respondida passa mais confiança do que nenhuma. Se ele atualizar a nota, agradeça de novo.';
    return { reply: reply, analysis: analysis, tip: tip, lang: lang };
  }

  var lastCities = [];
  function fillSelects(cities) {
    if (lastCities.length || !cities.length) return;
    lastCities = cities;
    var sv = $('rService'), ct = $('rCity');
    sv.replaceChildren(new Option('Detectar no texto / não sei', ''));
    SERVICES.forEach(function (s) { sv.append(new Option(s.en.charAt(0).toUpperCase() + s.en.slice(1), s.slug)); });
    ct.replaceChildren(new Option('Detectar no texto / não sei', ''));
    cities.forEach(function (c) { ct.append(new Option(c.name + ', ' + c.st, c.slug)); });
  }
  function run() {
    var text = $('rText').value;
    var service = $('rService').value || detectService(text);
    var city = $('rCity').value || detectCity(text, lastCities);
    var out = build({ name: $('rName').value, stars: $('rStars').value, text: text, service: service, city: city, lang: $('rLang').value, serviceAuto: !$('rService').value && !!service, cityAuto: !$('rCity').value && !!city }, lastCities);
    $('rOut').hidden = false;
    $('rAnal').replaceChildren.apply($('rAnal'), out.analysis.map(function (a) { var li = document.createElement('li'); var b = document.createElement('b'); b.textContent = a[0]; var sp = document.createElement('span'); sp.textContent = a[1]; li.append(b, sp); return li; }));
    $('rReply').textContent = out.reply;
    $('rCount').textContent = out.reply.split(/\s+/).length + ' palavras';
    $('rTip').textContent = out.tip;
  }
  $('rgen').addEventListener('submit', function (e) { e.preventDefault(); seed = 0; run(); });
  $('rAgain').addEventListener('click', function () { seed++; run(); });
  $('rCopy').addEventListener('click', function () {
    var b = $('rCopy');
    navigator.clipboard.writeText($('rReply').textContent).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar resposta'; }, 1500); }).catch(function () { b.textContent = 'Selecione e copie'; });
  });

  var LS_REV = 'ps-reviews-answered-v1';
  function getDone() { try { return JSON.parse(localStorage.getItem(LS_REV) || '{}'); } catch (e) { return {}; } }
  function setDone(d) { try { localStorage.setItem(LS_REV, JSON.stringify(d)); } catch (e) { /* storage blocked */ } }
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function copyBtnR(text, label) {
    var b = mk('button', { class: 'btn', type: 'button', text: label });
    b.addEventListener('click', function () { navigator.clipboard.writeText(text).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = label; }, 1500); }).catch(function () { b.textContent = 'Selecione e copie'; }); });
    return b;
  }
  var lastState = null;
  function renderNew(r) {
    var done = getDone();
    var list = (r.pending || []);
    var open = list.filter(function (p) { return !done[p.id]; });
    var box = $('revNew');
    if (!list.length) { box.replaceChildren(mk('div', { class: 'empty', text: 'Nenhuma avaliação nova esperando resposta.' })); }
    else box.replaceChildren.apply(box, list.map(function (p) {
      var isDone = !!done[p.id];
      var stars = '★★★★★'.slice(0, p.stars || 0) + '☆☆☆☆☆'.slice(0, 5 - (p.stars || 0));
      var mark = mk('button', { class: 'btn ' + (isDone ? '' : 'ok'), type: 'button', text: isDone ? 'Desfazer' : 'Marquei como respondida' });
      mark.addEventListener('click', function () { var d = getDone(); if (d[p.id]) delete d[p.id]; else d[p.id] = new Date().toISOString(); setDone(d); if (lastState) window.psReviews.render(lastState); });
      var alt = p.replyAlt ? copyBtnR(p.replyAlt, 'Copiar 2ª versão') : null;
      return mk('article', { class: 'gpost' + (isDone ? ' done' : '') }, [
        mk('div', { class: 'top' }, [mk('span', { class: 'where', text: (p.firstName || 'Avaliação nova') + ' · ' + stars + ' · ' + (p.date ? new Date(p.date).toLocaleDateString('pt-BR') : '') }), mk('span', { class: 'pill', 'data-s': isDone ? 'ok' : (p.priority === 'high' ? 'error' : 'warning'), text: isDone ? 'Respondida' : (p.priority === 'high' ? 'Responder hoje' : 'Sem resposta') })]),
        p.text ? mk('div', { class: 'txt', style: 'max-height:120px', text: '“' + p.text + '”' + (p.truncated ? ' (texto cortado no e-mail)' : '') }) : null,
        mk('h3', { text: 'Resposta pronta' }),
        mk('div', { class: 'txt rreply', text: p.reply || '' }),
        mk('div', { class: 'acts' }, [copyBtnR(p.reply || '', 'Copiar resposta'), alt, p.link ? mk('a', { class: 'btn go', href: p.link, target: '_blank', rel: 'noopener', text: 'Responder no Google' }) : null, mark]),
        p.note ? mk('p', { class: 'note', style: 'margin:0', text: p.note }) : null
      ]);
    }));
    var pill = $('revNewPill');
    pill.dataset.s = open.length ? (open.some(function (p) { return p.priority === 'high'; }) ? 'error' : 'warning') : 'ok';
    pill.textContent = open.length ? open.length + ' para responder' : 'Nada pendente';
    return open.length;
  }

  window.psReviews = {
    render: function (state) {
      lastState = state;
      if (state.status && state.status.cities) fillSelects(state.status.cities);
      var r = state.reviews; if (!r) return;
      var pend = renderNew(r);
      var pill = $('revPill'); pill.dataset.s = pend ? 'error' : 'ok'; pill.textContent = pend ? pend + ' sem resposta' : 'Todas respondidas';
      var badge = $('revBadge'); badge.hidden = !pend; badge.textContent = pend;
      var when = r.checkedAt ? new Date(r.checkedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      $('revStatus').textContent = 'Nota ' + Number(r.rating).toFixed(1).replace('.', ',') + '★ com ' + r.total + ' avaliações. ' + (r.note || '') + (when ? ' Conferido no perfil em ' + when + '.' : '') + ' Avaliações novas aparecem sozinhas aqui (o monitor lê o aviso do Google no Gmail a cada 3 horas) e você recebe uma notificação no celular.';
    }
  };
})();
