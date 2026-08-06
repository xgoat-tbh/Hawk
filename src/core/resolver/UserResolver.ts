import type { Guild, GuildMember } from 'discord.js';
import type { ResolvedUser, ResolutionResult } from '../../types/resolver.js';
import { isSnowflake } from '../utils/validators.js';

export async function resolveUser(input: string, guild: Guild): Promise<ResolutionResult<ResolvedUser>> {
  const mentionMatch = /^<@!?(\d{17,20})>$/.exec(input.trim());
  const idInput = mentionMatch ? mentionMatch[1] : input.trim();

  if (isSnowflake(idInput)) {
    try {
      const member = await guild.members.fetch(idInput);
      if (member) {
        return { success: true, value: memberToResolved(member) };
      }
    } catch {
      // Fallback to fetching User object if not a guild member
    }

    try {
      const user = await guild.client.users.fetch(idInput);
      return {
        success: true,
        value: {
          id: user.id,
          username: user.username,
          displayName: user.displayName ?? user.username,
          tag: user.tag,
          member: null,
          user,
        },
      };
    } catch {
      return { success: false, error: `Could not find user with ID \`${idInput}\`.` };
    }
  }

  return { success: false, error: `Invalid user format. Please provide a valid User ID or User Mention (\`${input}\`).` };
}

function memberToResolved(member: GuildMember): ResolvedUser {
  return { id: member.id, username: member.user.username, displayName: member.displayName, tag: member.user.tag, member, user: member.user };
}
