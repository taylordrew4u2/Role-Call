import { redirect } from "next/navigation";

type Params = Promise<{ projectId: string }>;

export default async function AdminPage({ params }: { params: Params }) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}`);
}
