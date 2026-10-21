// Mars canlı fiyat proxy'si (Node 18+, bağımlılık yok)
// Çalıştır:  IGNAV_KEY=anahtariniz ALLOWED_ORIGIN=https://siteniz.com node server.js
// API anahtarı yalnızca bu sunucuda durur; HTML dosyasına ASLA yazmayın.
const http = require("http");
const KEY = process.env.IGNAV_KEY, ORIGIN = process.env.ALLOWED_ORIGIN || "*", PORT = process.env.PORT || 8787;
const BASE = "https://ignav.com/api";
const cache = new Map(), TTL = 10 * 60 * 1000;          // aynı aramayı 10 dk önbellekle (maliyet)
const hits = new Map();                                  // basit IP başına dakikada 60 istek sınırı

async function ignav(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "X-Api-Key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("upstream " + r.status);
  return r.json();
}
http.createServer(async (req, res) => {
  const h = { "Access-Control-Allow-Origin": ORIGIN, "Content-Type": "application/json" };
  const send = (c, o) => { res.writeHead(c, h); res.end(JSON.stringify(o)); };
  if (req.method === "OPTIONS") { res.writeHead(204, { ...h, "Access-Control-Allow-Methods": "GET" }); return res.end(); }
  const ip = req.socket.remoteAddress, now = Date.now(), w = (hits.get(ip) || []).filter(t => now - t < 6e4);
  if (w.length >= 60) return send(429, { error: "rate" }); w.push(now); hits.set(ip, w);
  const u = new URL(req.url, "http://x"), q = u.searchParams;
  try {
    if (!KEY) return send(500, { error: "IGNAV_KEY tanımlı değil" });
    if (u.pathname === "/search") {
      const from = q.get("from"), to = q.get("to"), date = q.get("date"), ret = q.get("return");
      if (!/^[A-Z]{3}$/.test(from || "") || !/^[A-Z]{3}$/.test(to || "") || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return send(400, { error: "bad params" });
      const key = [from, to, date, ret].join("|"), c = cache.get(key);
      if (c && now - c.t < TTL) return send(200, c.d);
      const d = ret
        ? await ignav("/fares/round-trip", { origin: from, destination: to, departure_date: date, return_date: ret })
        : await ignav("/fares/one-way", { origin: from, destination: to, departure_date: date });
      cache.set(key, { t: now, d }); return send(200, d);
    }
    if (u.pathname === "/booking") {
      const id = q.get("id"); if (!id) return send(400, { error: "bad params" });
      return send(200, await ignav("/fares/booking-links", { ignav_id: id }));
    }
    send(404, { error: "not found" });
  } catch (e) { send(502, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log("Mars proxy :" + PORT));
