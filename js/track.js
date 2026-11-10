// Perfect Services: lead tracking. Pushes click_call, click_sms, click_email, click_estimate and generate_lead
// (estimate form sent) to the dataLayer, each with the page's city and service. Google Tag Manager
// (GTM-WTM3FM9G) sends them to GA4. Falls back to gtag() when the page still has the direct GA4 tag.
(function () {
  function ctx() {
    var m = location.pathname.match(/^\/areas\/([^/]+)\/(?:([^/]+)\/)?/);
    var s = location.pathname.match(/^\/services\/([^/]+)\//);
    var b = location.pathname.match(/^\/blog\/([^/]+?)(?:\.html|\/|$)/);
    return {
      page_city: m ? m[1] : (b && /-(sc|nc)$/.test(b[1]) ? b[1] : 'none'),
      page_service: m && m[2] ? m[2] : (s ? s[1] : 'none'),
      page_type: m ? (m[2] ? 'city_service' : 'city') : s ? 'service' : b ? 'blog' : (location.pathname === '/' ? 'home' : 'other')
    };
  }
  function send(name, extra) {
    var p = ctx();
    p.link_location = 'none'; p.form_name = 'none'; p.requested_service = 'none';
    for (var k in extra) p[k] = extra[k];
    window.dataLayer = window.dataLayer || [];
    var hasGtm = window.dataLayer.some && window.dataLayer.some(function (e) { return e && e.event === 'gtm.js'; });
    if (hasGtm) { p.event = name; window.dataLayer.push(p); }
    else if (typeof window.gtag === 'function') window.gtag('event', name, p);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var where = a.closest('.callbar') ? 'mobile_bar' : a.closest('header, .strip') ? 'header' : a.closest('footer') ? 'footer' : 'content';
    if (href.indexOf('tel:') === 0) send('click_call', { link_location: where });
    else if (href.indexOf('sms:') === 0) send('click_sms', { link_location: where });
    else if (href.indexOf('mailto:') === 0) send('click_email', { link_location: where });
    else if (/#(estimate|book)$/.test(href)) send('click_estimate', { link_location: where });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches('form')) return;
    var svc = f.querySelector('select[name*="service" i], select');
    send('generate_lead', { form_name: f.getAttribute('name') || 'estimate', requested_service: svc ? svc.value : 'none' });
  }, true);
})();
