import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#dff3ff_0%,#f7fbff_32%,#f8fafc_68%,#fff8ec_100%)] px-4 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
