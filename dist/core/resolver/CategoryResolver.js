import { ChannelType } from 'discord.js';
import { isSnowflake } from '../utils/validators.js';
import { layeredMatch } from './LayeredMatcher.js';
export function resolveCategory(input, guild) {
    const trimmed = input.trim();
    if (!trimmed)
        return { success: false, error: 'No category specified.' };
    // Snowflake ID
    if (isSnowflake(trimmed)) {
        const channel = guild.channels.cache.get(trimmed);
        if (channel && channel.type === ChannelType.GuildCategory) {
            const cat = channel;
            return { success: true, value: { id: cat.id, name: cat.name, category: cat } };
        }
        return { success: false, error: `Could not find category with ID \`${trimmed}\`.` };
    }
    // Collect categories
    const categories = [];
    for (const [id, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildCategory) {
            categories.push({ id, name: channel.name });
        }
    }
    if (categories.length === 0) {
        return { success: false, error: 'This server has no categories.' };
    }
    const result = layeredMatch(categories, trimmed);
    switch (result.outcome) {
        case 'resolved': {
            const cat = guild.channels.cache.get(result.item.id);
            if (!cat)
                return { success: false, error: `Could not find a category matching \`${trimmed}\`.` };
            return { success: true, value: { id: cat.id, name: cat.name, category: cat } };
        }
        case 'ambiguous': {
            const list = result.candidates
                .slice(0, 5)
                .map(c => `• ${c.name}`)
                .join('\n');
            return {
                success: false,
                error: `Multiple categories match \`${trimmed}\`. Please be more specific:\n${list}`,
            };
        }
        case 'not_found':
            return { success: false, error: `Could not find a category matching \`${trimmed}\`.` };
    }
}
//# sourceMappingURL=CategoryResolver.js.map