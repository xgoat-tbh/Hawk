import { redirect } from 'next/navigation';

export default async function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  redirect(`/dashboard/${guildId}/general`);
}
