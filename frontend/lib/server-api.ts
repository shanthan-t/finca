import { getServerApiUrl, hasServerApiUrl } from "@/lib/server-env";

export { getServerApiUrl } from "@/lib/server-env";

export async function postBlockchainJson<T>(path: string, payload: unknown): Promise<T> {
  if (!hasServerApiUrl()) {
    throw new Error("API_URL is missing or invalid. Point it to your FastAPI service before using blockchain actions.");
  }

  const url = `${getServerApiUrl()}${path}`;
  console.log(`[API] Upstream POST: ${url}`);

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const data = (await upstream.json().catch((err) => {
    console.error(`[API] Failed to parse JSON from ${url}:`, err);
    return null;
  })) as
    | (T & {
        message?: string;
      })
    | null;

  if (!upstream.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Blockchain service request failed with status ${upstream.status}.`;

    console.error(`[API] Upstream failed: ${url} (${upstream.status})`, data);
    throw new Error(message);
  }

  if (!data) {
    console.error(`[API] Upstream returned no data: ${url}`);
    throw new Error("The blockchain service returned an empty response.");
  }

  return data;
}

export async function forwardBlockchainPost(request: Request, path: string) {
  if (!hasServerApiUrl()) {
    return Response.json(
      {
        message: "API_URL is missing or invalid. Point it to your FastAPI service before using blockchain actions."
      },
      { status: 500 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (err) {
    console.error(`[API] Failed to parse request JSON for ${path}:`, err);
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  const url = `${getServerApiUrl()}${path}`;
  console.log(`[API] Forwarding POST: ${url}`);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const raw = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    if (!upstream.ok) {
      console.error(`[API] Upstream forwarding failed: ${url} (${upstream.status})`, raw);
    }

    return new Response(raw, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType
      }
    });
  } catch (error) {
    console.error(`[API] Network error forwarding to ${url}:`, error);
    const message = error instanceof Error ? error.message : "The blockchain service could not be reached.";

    return Response.json(
      {
        message
      },
      { status: 502 }
    );
  }
}
