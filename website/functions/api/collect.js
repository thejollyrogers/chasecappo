function parseUA(ua) {
  ua = ua || '';
  var browser = 'Other', os = 'Other', device = 'Desktop';

  if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(ua)) device = 'Mobile';
  else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) device = 'Tablet';

  return { browser, os, device };
}

async function visitorHash(ip, ua, date, salt) {
  var raw = salt + '|' + date + '|' + ip + '|' + ua;
  var encoded = new TextEncoder().encode(raw);
  var buf = await crypto.subtle.digest('SHA-256', encoded);
  var arr = new Uint8Array(buf);
  return Array.from(arr.slice(0, 8)).map(function(b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function randomId() {
  var arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function(b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function extractDomain(referrer, hostname) {
  if (!referrer) return null;
  try {
    var u = new URL(referrer);
    if (u.hostname === hostname || u.hostname === 'www.' + hostname) return null;
    return u.hostname.replace(/^www\./, '');
  } catch(e) { return null; }
}

var EVENT_TYPES = { pv: 'pageview', ev: 'custom', ol: 'outbound', dl: 'download', fs: 'form_submit' };

export async function onRequestPost(context) {
  var { request, env } = context;

  var body;
  try {
    body = await request.json();
  } catch(e) {
    try {
      var text = await request.text();
      body = JSON.parse(text);
    } catch(e2) {
      return new Response('', { status: 400 });
    }
  }

  if (!body || !body.t || !body.p || !body.h) {
    return new Response('', { status: 400 });
  }

  var ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
  var ua = request.headers.get('User-Agent') || '';
  var salt = env.ANALYTICS_SALT || 'chasecappo-default-salt';

  var cf = request.cf || {};
  var country = cf.country || request.headers.get('CF-IPCountry') || null;
  var region = cf.region || null;
  var city = cf.city || null;
  var latitude = cf.latitude ? parseFloat(cf.latitude) : null;
  var longitude = cf.longitude ? parseFloat(cf.longitude) : null;

  if (/bot|crawl|spider|slurp|feed|fetch|scan/i.test(ua)) {
    return new Response('', { status: 202 });
  }

  var now = new Date();
  var dateStr = now.toISOString().slice(0, 10);
  var hash = await visitorHash(ip, ua, dateStr, salt);
  var eventType = EVENT_TYPES[body.t] || 'pageview';
  var hostname = (body.h || '').slice(0, 100);
  var pathname = (body.p || '/').slice(0, 500);

  if (body.d && body.t === 'pv') {
    try {
      await env.DB.prepare(
        "UPDATE analytics_events SET duration = ? WHERE id = (SELECT id FROM analytics_events WHERE visitor_hash = ? AND event_type = 'pageview' ORDER BY id DESC LIMIT 1)"
      ).bind(Math.min(body.d, 1800), hash).run();
    } catch(e) {}
    return new Response('', { status: 202 });
  }

  try {
    var oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    var countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM analytics_events WHERE visitor_hash = ? AND created_at > ?"
    ).bind(hash, oneHourAgo).first();
    if (countResult && countResult.cnt > 100) {
      return new Response('', { status: 202 });
    }
  } catch(e) {}

  var sessionId;
  var entryPage = 0;
  try {
    var thirtyMinAgo = new Date(now.getTime() - 1800000).toISOString();
    var lastEvent = await env.DB.prepare(
      "SELECT session_id FROM analytics_events WHERE visitor_hash = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1"
    ).bind(hash, thirtyMinAgo).first();
    if (lastEvent) {
      sessionId = lastEvent.session_id;
    } else {
      sessionId = randomId();
      entryPage = eventType === 'pageview' ? 1 : 0;
    }
  } catch(e) {
    sessionId = randomId();
    entryPage = eventType === 'pageview' ? 1 : 0;
  }

  var referrer = extractDomain(body.r, hostname);
  var parsed = parseUA(ua);

  try {
    await env.DB.prepare(
      `INSERT INTO analytics_events
        (visitor_hash, session_id, event_type, event_name, pathname, hostname, referrer,
         utm_source, utm_medium, utm_campaign, device_type, browser, os, country,
         region, city, latitude, longitude,
         screen_width, props, entry_page, duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(
      hash, sessionId, eventType,
      body.n || null,
      pathname, hostname, referrer,
      body.us || null, body.um || null, body.uc || null,
      parsed.device, parsed.browser, parsed.os, country,
      region, city, latitude, longitude,
      body.sw || null,
      body.pr ? JSON.stringify(body.pr) : null,
      entryPage,
      now.toISOString()
    ).run();
  } catch(e) {
    console.error('Analytics insert error:', e);
  }

  return new Response('', { status: 202 });
}
