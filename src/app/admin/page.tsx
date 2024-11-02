import { getUnapprovedGroups } from "~/actions/group";
import { Admin } from "~/components/admin";
import { auth } from "~/lib/auth";

export default async function Page() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-4xl font-bold text-primary">403 | Forbidden</h1>
      </div>
    );
  }

  const unapproved = await getUnapprovedGroups();

  return <Admin groups={unapproved} />;
}
