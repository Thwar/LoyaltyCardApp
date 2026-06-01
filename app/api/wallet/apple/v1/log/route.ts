export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Apple posts diagnostic logs here when pass updates fail. Just record them.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[apple-wallet-log]", JSON.stringify(body));
  } catch {
    // ignore malformed log bodies
  }
  return new Response(null, { status: 200 });
}
