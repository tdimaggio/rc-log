export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/proxy') return handleProxy(request);
    if (url.pathname === '/env')   return handleEnv(env);

    return env.ASSETS.fetch(request);
  },
};

async function handleProxy(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (request.method !== 'GET') {
    return new Response('GET only', { status: 405 });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return new Response('Bad request: missing ?url=', { status: 400 });

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response('Bad request: invalid url', { status: 400 });
  }

  if (!targetUrl.hostname.endsWith('liverc.com')) {
    return new Response('Forbidden: only liverc.com URLs are allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(`Upstream error: ${e.message}`, { status: 502 });
  }
}

async function handleEnv(env) {
  return new Response(
    JSON.stringify({ GEMINI_KEY: env.GEMINI_KEY || '' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
