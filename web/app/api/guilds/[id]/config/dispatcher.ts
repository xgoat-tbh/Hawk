import { HandlerResult } from './helpers';
import { handleGeneral } from './handlers/general';
import { handleEconomy } from './handlers/economy';
import { handlePvc } from './handlers/pvc';
import { handleWelcome } from './handlers/welcome';
import { handleCommunity } from './handlers/community';
import { handleStore } from './handlers/store';
import { handleGaming } from './handlers/gaming';
import { handleIncome } from './handlers/income';
import { handleSticky } from './handlers/sticky';
import { handleMedia } from './handlers/media';
import { handlePermissions } from './handlers/permissions';

export async function handleConfigModule(
  guildId: string,
  module: string,
  data: any
): Promise<HandlerResult> {
  switch (module) {
    case 'general':
      return handleGeneral(guildId, data);

    case 'economy':
      return handleEconomy(guildId, data);

    case 'pvc':
      return handlePvc(guildId, data);

    case 'welcome':
      return handleWelcome(guildId, data);

    case 'community':
      return handleCommunity(guildId, data);

    case 'add_store_item':
    case 'delete_store_item':
      return handleStore(guildId, module, data);

    case 'gaming_add_ping':
    case 'gaming_delete_ping':
    case 'gaming_set_test_channel':
      return handleGaming(guildId, module, data);

    case 'income_add_role':
    case 'income_delete_role':
      return handleIncome(guildId, module, data);

    case 'sticky_add':
    case 'sticky_set':
    case 'sticky_update':
    case 'sticky_delete':
      return handleSticky(guildId, module, data);

    case 'media_add':
    case 'media_delete':
    case 'media_set_autothread':
      return handleMedia(guildId, module, data);

    case 'permit_add':
    case 'permit_delete':
    case 'restrict_add':
    case 'restrict_delete':
    case 'ignore_add':
    case 'ignore_delete':
      return handlePermissions(guildId, module, data);

    default:
      return { success: false, error: `Unknown module: ${module}`, status: 400 };
  }
}
