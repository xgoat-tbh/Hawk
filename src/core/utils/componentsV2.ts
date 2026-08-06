import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';

export interface ComponentV2Options {
  accentColor?: number;
  text?: string;
  sections?: string[];
  components?: ActionRowBuilder<any>[];
  divider?: boolean;
}

export interface ComponentV2Payload {
  components: ContainerBuilder[];
  flags: number;
}

export function buildV2Container(options: ComponentV2Options): ComponentV2Payload {
  const container = new ContainerBuilder();
  if (options.accentColor !== undefined) {
    container.setAccentColor(options.accentColor);
  }

  if (options.text) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.text));
  }

  if (options.sections && options.sections.length > 0) {
    for (let i = 0; i < options.sections.length; i++) {
      if (i > 0 || options.text) {
        if (options.divider !== false) {
          container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }
      }
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.sections[i]));
    }
  }

  if (options.components && options.components.length > 0) {
    if (options.divider !== false && (options.text || (options.sections && options.sections.length > 0))) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    }
    for (const row of options.components) {
      container.addActionRowComponents(row);
    }
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
