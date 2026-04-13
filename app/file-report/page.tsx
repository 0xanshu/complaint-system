import ComplaintForm from "@/components/complaint-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FileReportPage() {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  return <ComplaintForm />;
}
