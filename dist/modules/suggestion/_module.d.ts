import { handleSuggestionButton, handleSuggestionModal, handleSuggestionPanelResurface, initializeSuggestionPanels, handleSuggestionReactionAdd, handleSuggestionReactionRemove } from './_suggestionHandler.js';
declare const _default: {
    name: string;
    description: string;
    buttonPrefixes: string[];
    modalPrefixes: string[];
    onButton: typeof handleSuggestionButton;
    onModal: typeof handleSuggestionModal;
    onMessage: typeof handleSuggestionPanelResurface;
    onReactionAdd: typeof handleSuggestionReactionAdd;
    onReactionRemove: typeof handleSuggestionReactionRemove;
    onReady: typeof initializeSuggestionPanels;
};
export default _default;
//# sourceMappingURL=_module.d.ts.map