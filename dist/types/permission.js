// ── Authority Levels ────────────────────────────────────────
export var AuthorityLevel;
(function (AuthorityLevel) {
    /** Normal server member — no special bypass */
    AuthorityLevel[AuthorityLevel["Normal"] = 0] = "Normal";
    /** User/role with an explicit custom permit for this command */
    AuthorityLevel[AuthorityLevel["Permitted"] = 1] = "Permitted";
    /** Server owner or configured server administrator */
    AuthorityLevel[AuthorityLevel["ServerAdmin"] = 2] = "ServerAdmin";
    /** Bot administrator — bypasses normal permission checks */
    AuthorityLevel[AuthorityLevel["BotAdmin"] = 3] = "BotAdmin";
    /** Bot owner/developer — bypasses everything */
    AuthorityLevel[AuthorityLevel["Owner"] = 4] = "Owner";
})(AuthorityLevel || (AuthorityLevel = {}));
//# sourceMappingURL=permission.js.map