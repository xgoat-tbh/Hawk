import type { Message } from 'discord.js';
import type { ContainerBuilder } from 'discord.js';
import type { CommandContext } from '../../types/command.js';
import { ui } from '../ui/index.js';

export interface ComponentV2Options {
  accentColor?: number;
  text?: string;
  sections?: string[];
  components?: any[];
  divider?: boolean;
}

export interface ComponentV2Payload {
  components: ContainerBuilder[];
  flags: number;
}

export interface PaginatedV2Options {
  title: string;
  items: string[];
  pageSize?: number;
  accentColor?: number;
  emptyText?: string;
  timeoutMs?: number;
}

export function buildV2Container(options: ComponentV2Options): ComponentV2Payload {
  return ui.standard({
    text: options.text,
    sections: options.sections,
    components: options.components,
    divider: options.divider,
    accentColor: options.accentColor,
  });
}

export async function sendPaginatedV2Container(
  ctx: CommandContext,
  options: PaginatedV2Options,
): Promise<Message> {
  return ui.paginated(ctx, {
    title: options.title,
    items: options.items,
    pageSize: options.pageSize,
    emptyText: options.emptyText,
    timeoutMs: options.timeoutMs,
    accentColor: options.accentColor,
  });
}
