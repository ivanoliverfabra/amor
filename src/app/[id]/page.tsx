import { getGroup } from "~/actions/group";
import { MatchingGroup } from "~/components/group";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: Readonly<{ params: Params }>) {
  const group = await getGroup(parseInt((await params).id));

  return <MatchingGroup initialGroup={group} rollType="redirect" />;
}
