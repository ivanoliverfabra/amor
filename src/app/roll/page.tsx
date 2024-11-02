import { getGroup, getRandomGroup } from "~/actions/group";
import { MatchingGroup } from "~/components/group";

type SearchParams = Promise<{ id: string | undefined | null }>;

export default async function Page({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const { id } = await searchParams;
  const group = id
    ? (await getGroup(parseInt(id))) ?? null
    : (await getRandomGroup()) ?? null;
  return <MatchingGroup initialGroup={group} rollType="random" />;
}
