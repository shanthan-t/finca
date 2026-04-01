export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      message: "TTS generation is not wired yet. Replace this placeholder route with your provider integration."
    },
    { status: 501 }
  );
}
