export async function onRequest(context) {
  const { env } = context;
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
