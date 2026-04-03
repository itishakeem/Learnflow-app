import { NextRequest, NextResponse } from "next/server";

// Server-side env vars — read at request time, set via K8s ConfigMap
const SERVICE_URLS: Record<string, string> = {
  triage: process.env.TRIAGE_URL ?? "http://triage:8000",
  concepts: process.env.CONCEPTS_URL ?? "http://concepts-agent:8000",
  exercise: process.env.EXERCISE_URL ?? "http://exercise-agent:8000",
  progress: process.env.PROGRESS_URL ?? "http://progress-agent:8000",
  debug: process.env.DEBUG_URL ?? "http://debug-agent:8000",
  auth: process.env.AUTH_URL ?? "http://auth:8000",
};

type Params = Promise<{ service: string; path: string[] }>;

async function proxy(req: NextRequest, service: string, pathSegments: string[]) {
  const base = SERVICE_URLS[service];
  if (!base) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const url = `${base}/${pathSegments.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = { method: req.method };

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    headers["content-type"] = req.headers.get("content-type") ?? "application/json";
  }

  if (Object.keys(headers).length > 0) init.headers = headers;

  try {
    const upstream = await fetch(url, init);
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    // For SSE / streaming responses, pipe the body directly without buffering
    if (contentType.includes("text/event-stream")) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-accel-buffering": "no",
        },
      });
    }

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": contentType },
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

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { service, path } = await params;
  return proxy(req, service, path);
}
