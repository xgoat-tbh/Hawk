import { handleMemberJoin, handleMemberLeave, handleWelcomeButton, handleWelcomeModal, } from './_welcomeHandler.js';
export default {
    name: 'welcome',
    description: 'Welcome and leave card system',
    buttonPrefixes: ['welcome_'],
    modalPrefixes: ['welcome_modal_'],
    onButton: handleWelcomeButton,
    onModal: handleWelcomeModal,
    onMemberJoin: handleMemberJoin,
    onMemberLeave: handleMemberLeave,
};
//# sourceMappingURL=_module.js.map