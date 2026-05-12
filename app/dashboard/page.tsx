import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) redirect("/login");

  const payload = verifyToken(token) as { userId: string; email: string } | null;
  if (!payload) redirect("/login");

  return <DashboardClient userId={payload.userId} email={payload.email} />;
}
