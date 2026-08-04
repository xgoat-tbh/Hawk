import type { Guild, GuildMember } from 'discord.js';
import Fuse from 'fuse.js';
import type { ResolvedUser, ResolutionResult } from '../../types/resolver.js';
import { isSnowflake } from '../utils/validators.js';
import { constants } from '../config/constants.js';

export async function resolveUser(input: string, guild: Guild): Promise<ResolutionResult<ResolvedUser>> {
  const mentionMatch = /^<@!?(\d{17,20})>$/.exec(input);
  const idInput = mentionMatch ? mentionMatch[1] : input;

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
      return { success: true, value: { id: user.id, username: user.username, displayName: user.displayName ?? user.username, tag: user.tag, member: null, user } };
    } catch {
      return { success: false, error: `Could not find user with ID \`${idInput}\`.` };
    }
  }

  let members = guild.members.cache;
  let searchItems = members.map(m => ({ id: m.id, username: m.user.username, displayName: m.displayName, tag: m.user.tag, nickname: m.nickname ?? '' }));
  let fuse = new Fuse(searchItems, { keys: ['username', 'displayName', 'tag', 'nickname'], threshold: constants.fuseThreshold, isCaseSensitive: false });
  let results = fuse.search(input, { limit: 1 });

  if (results.length === 0) {
    try {
      const fetched = await guild.members.fetch({ query: input, limit: 5 });
      if (fetched.size > 0) {
        members = guild.members.cache;
        searchItems = members.map(m => ({ id: m.id, username: m.user.username, displayName: m.displayName, tag: m.user.tag, nickname: m.nickname ?? '' }));
        fuse = new Fuse(searchItems, { keys: ['username', 'displayName', 'tag', 'nickname'], threshold: constants.fuseThreshold, isCaseSensitive: false });
        results = fuse.search(input, { limit: 1 });
      }
    } catch {
      // Ignore API query errors
    }
  }

  if (results.length === 0) return { success: false, error: `Could not find a user matching \`${input}\`.` };

  const match = members.get(results[0].item.id);
  if (!match) return { success: false, error: `Could not find a user matching \`${input}\`.` };
  return { success: true, value: memberToResolved(match) };
}

function memberToResolved(member: GuildMember): ResolvedUser {
  return { id: member.id, username: member.user.username, displayName: member.displayName, tag: member.user.tag, member, user: member.user };
}
