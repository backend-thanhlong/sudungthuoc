import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/dashboard/admin");
    } else {
      redirect("/dashboard/facility");
    }
  }

  redirect("/login");
}
