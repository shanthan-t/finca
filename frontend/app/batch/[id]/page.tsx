import { redirect } from "next/navigation";

export default function BatchAliasPage({
  params
}: {
  params: { id: string };
}) {
  redirect(`/batches/${params.id}`);
}
