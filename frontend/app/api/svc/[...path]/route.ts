import { NextRequest, NextResponse } from "next/server";

// Internal K8s DNS names — override in .env.local for local dev
const SERVICE_URLS: Record<string, string> = {
  triage:   process.env.TRIAGE_URL   ?? "http://triage:8000",
  concepts: process.env.CONCEPTS_URL ?? "http://concepts-agent:8000",
  exercise: process.env.EXERCISE_URL ?? "http://exercise-agent:8000",
  debug:    process.env.DEBUG_URL    ?? "http://debug-agent:8000",
  progress: process.env.PROGRESS_URL ?? "http://progress-agent:8000",
};

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const [service, ...rest] = segments;

  const baseUrl = SERVICE_URLS[service];
  if (!baseUrl) {
    return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 404 });
  }

  const path   = rest.length ? `/${rest.join("/")}` : "";
  const search = req.nextUrl.search;
  const url    = `${baseUrl}${path}${search}`;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.text()
    : undefined;

  try {
    const upstream = await fetch(url, { method: req.method, headers, body });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const DELETE = proxy;
