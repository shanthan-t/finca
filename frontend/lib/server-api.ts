const placeholderApiUrl = "https://your-render-url.onrender.com/api/v1";
const localApiUrl = "http://127.0.0.1:8000/api/v1";

export function getServerApiUrl() {
  const hostPort = process.env.API_HOSTPORT?.trim();
  const constructedHostPortUrl = hostPort ? `http://${hostPort}/api/v1` : null;
  const configuredUrl =
    process.env.API_URL ??
    constructedHostPortUrl ??
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === "development" ? localApiUrl : "");

  if (!configuredUrl || (process.env.NODE_ENV !== "development" && configuredUrl === placeholderApiUrl)) {
    throw new Error("API_URL is missing. Configure API_URL, API_HOSTPORT, or NEXT_PUBLIC_API_URL on the server.");
  }

  return configuredUrl.replace(/\/+$/, "");
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
