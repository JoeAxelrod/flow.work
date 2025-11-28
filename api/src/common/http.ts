export async function httpCall(cfg:any, input:any, timeoutMs:number) {
  const url = cfg.url || input?.url;
  const method = (cfg.method || 'POST').toUpperCase();
  const headers = { 'content-type': 'application/json', ...(cfg.headers || {}) };
  const body = cfg.body ?? input?.body ?? input;
  if (!url) throw new Error('http.url required');

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method, headers, signal: ctrl.signal,
      body: ['GET','HEAD'].includes(method) ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { text }; }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,300)}`);
    return { ...data };
  } finally { clearTimeout(to); }
}

