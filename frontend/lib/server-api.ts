const placeholderApiUrl = "https://your-render-url.onrender.com/api/v1";

export function getServerApiUrl() {
  const hostport = process.env.API_HOSTPORT?.trim() ?? "";
  const configuredUrl = process.env.API_URL?.trim() ?? process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

  if (hostport) {
    const prefixed = /^https?:\/\//.test(hostport) ? hostport : `http://${hostport}`;
    const normalized = prefixed.replace(/\/+$/, "");

    return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
  }

  if (!configuredUrl || configuredUrl === placeholderApiUrl) {
    throw new Error("API_URL is missing. Configure API_URL, API_HOSTPORT, or NEXT_PUBLIC_API_URL on the server.");
  }

  return configuredUrl.replace(/\/+$/, "");
}

export async function postBlockchainJson<T>(path: string, payload: unknown): Promise<T> {
  const upstream = await fetch(`${getServerApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const data = (await upstream.json().catch(() => null)) as
    | (T & {
        message?: string;
      })
    | null;

  if (!upstream.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Blockchain service request failed with status ${upstream.status}.`;

    throw new Error(message);
  }

  if (!data) {
    throw new Error("The blockchain service returned an empty response.");
  }

  return data;
}

export async function forwardBlockchainPost(request: Request, path: string) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getServerApiUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const raw = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new Response(raw, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The blockchain service could not be reached.";

    return Response.json(
      {
        message
      },
      { status: 502 }
    );
  }
}
