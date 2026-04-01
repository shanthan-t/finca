import { forwardBlockchainPost } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return forwardBlockchainPost(request, "/batches");
}
