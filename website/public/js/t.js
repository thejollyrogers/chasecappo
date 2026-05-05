(function() {
  'use strict';
  var ep = '/api/collect';
  var path = location.pathname;
  var start = Date.now();
  var sp = new URLSearchParams(location.search);
  var utm = {
    s: sp.get('utm_source') || undefined,
    m: sp.get('utm_medium') || undefined,
    c: sp.get('utm_campaign') || undefined
  };

  function send(type, name, props, dur) {
    var d = {
      t: type,
      p: path,
      h: location.hostname,
      r: document.referrer || undefined,
      sw: window.innerWidth
    };
    if (utm.s) d.us = utm.s;
    if (utm.m) d.um = utm.m;
    if (utm.c) d.uc = utm.c;
    if (name) d.n = name;
    if (props) d.pr = props;
    if (dur) d.d = dur;
    var payload = JSON.stringify(d);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ep, payload);
    } else {
      fetch(ep, { method: 'POST', body: payload, keepalive: true });
    }
  }

  send('pv');

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      var dur = Math.round((Date.now() - start) / 1000);
      if (dur > 0 && dur < 1800) send('pv', null, null, dur);
    }
  });

  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href) return;
    try {
      var u = new URL(a.href);
      if (u.hostname !== location.hostname) {
        send('ol', 'Outbound Link: Click', { url: a.href });
      }
      if (/\.(pdf|zip|docx?|xlsx?|csv|mp3|mp4|dmg|exe)$/i.test(u.pathname)) {
        send('dl', 'File Download', { url: a.href });
      }
    } catch(x) {}
  });

  document.addEventListener('submit', function(e) {
    if (e.target.tagName === 'FORM') {
      send('fs', 'Form: Submission', { page: path });
    }
  });

  window.track = function(name, props) {
    send('ev', name, props);
  };
})();
