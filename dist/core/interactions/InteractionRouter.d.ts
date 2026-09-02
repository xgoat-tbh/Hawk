import type { Interaction } from 'discord.js';
import type { ModuleManifest } from '../../types/module.js';
export declare class InteractionRouter {
    private buttonRoutes;
    private selectRoutes;
    private channelSelectRoutes;
    private modalRoutes;
    registerModule(manifest: ModuleManifest): void;
    registerModules(manifests: ModuleManifest[]): void;
    dispatch(interaction: Interaction): Promise<boolean>;
    private dispatchButton;
    private dispatchSelect;
    private dispatchChannelSelect;
    private dispatchModal;
}
export declare const interactionRouter: InteractionRouter;
//# sourceMappingURL=InteractionRouter.d.ts.map