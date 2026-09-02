export var MessageType;
(function (MessageType) {
    MessageType["Normal"] = "normal";
    MessageType["PrefixCommand"] = "prefix_command";
})(MessageType || (MessageType = {}));
export function classifyMessage(message, prefix) {
    const content = message.content.trim();
    if (content.toLowerCase().startsWith(prefix.toLowerCase()))
        return MessageType.PrefixCommand;
    return MessageType.Normal;
}
//# sourceMappingURL=MentionHandler.js.map