interface GatewayClient {
  isReady(): boolean;
  ws: { ping: number };
  guilds: { cache: { get(id: string): { available?: boolean } | undefined } };
}

export function botConnection(client: GatewayClient | undefined, guildId: string) {
  const botReady = Boolean(client?.isReady());
  const guild = client?.guilds.cache.get(guildId);
  const guildAvailable = Boolean(guild && guild.available !== false);
  const ping = client?.ws.ping;
  return {
    status: !client ? 'unavailable' : !botReady ? 'disconnected' : !guildAvailable ? 'guild-unavailable' : 'connected',
    botReady,
    guildAvailable,
    gatewayLatencyMs: botReady && guildAvailable && typeof ping === 'number' && Number.isFinite(ping) && ping >= 0 ? Math.round(ping) : null,
  };
}
