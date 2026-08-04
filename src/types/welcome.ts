export interface WelcomeConfig {
  guildId: string;
  greetChannelId: string | null;
  greetPayload: string | null;
  leaveChannelId: string | null;
  leavePayload: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariableContext {
  username: string;
  usermention: string;
  usertag: string;
  useravatar: string;
  servername: string;
  servermember: number;
  serveravatar: string;
  randomuser: string;
}
