export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const apiKey = env.TMDB_API_KEY || 'fb7bb23f03b6994dafc674c074d01761';
  const tmdbUrl = new URL(`https://api.themoviedb.org/3${path}`);

  // Copy other query params
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'path') {
      tmdbUrl.searchParams.set(key, value);
    }
  }

  if (!tmdbUrl.searchParams.has('api_key')) {
    tmdbUrl.searchParams.set('api_key', apiKey);
  }
  if (!tmdbUrl.searchParams.has('language')) {
    tmdbUrl.searchParams.set('language', 'en-US');
  }

  try {
    const tmdbResponse = await fetch(tmdbUrl.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await tmdbResponse.text();

    return new Response(data, {
      status: tmdbResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch from TMDB' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
