export interface WelcomeFormState {
  enabled: boolean;
  channelId: string | null;
  isEmbed: boolean;
  sendAsDm: boolean;
  title: string;
  description: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
}

export const COLOR_PRESETS = [
  { name: 'Discord Blurple', hex: '#5865f2' },
  { name: 'Emerald', hex: '#22c55e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Coral Red', hex: '#ef4444' },
  { name: 'Deep Dark', hex: '#1e1f22' },
  { name: 'Clean White', hex: '#ffffff' },
];

export const VARIABLE_TOKENS = [
  { token: '{user}', label: '@Member (Mention)', desc: 'Pings the joining member' },
  { token: '{username}', label: 'Username', desc: 'Display name without @' },
  { token: '{server}', label: 'Server Name', desc: 'Current Discord guild name' },
  { token: '{server.count}', label: 'Member Count', desc: 'Total server member count' },
  { token: '{user.avatar}', label: 'User Avatar URL', desc: 'Joining user avatar image' },
];
