import { NextRequest, NextResponse } from "next/server";

// Server-side env vars — read at request time, set via K8s ConfigMap
const SERVICE_URLS: Record<string, string> = {
  triage: process.env.TRIAGE_URL ?? "http://triage:8000",
  concepts: process.env.CONCEPTS_URL ?? "http://concepts-agent:8000",
  exercise: process.env.EXERCISE_URL ?? "http://exercise-agent:8000",
  progress: process.env.PROGRESS_URL ?? "http://progress-agent:8000",
  debug: process.env.DEBUG_URL ?? "http://debug-agent:8000",
};

type Params = Promise<{ service: string; path: string[] }>;

async function proxy(req: NextRequest, service: string, pathSegments: string[]) {
  const base = SERVICE_URLS[service];
  if (!base) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const url = `${base}/${pathSegments.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = { method: req.method };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    init.headers = {
      "content-type": req.headers.get("content-type") ?? "application/json",
    };
  }

  try {
    const upstream = await fetch(url, init);
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { service, path } = await params;
  return proxy(req, service, path);
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { service, path } = await params;
  return proxy(req, service, path);
}
