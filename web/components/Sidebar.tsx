'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Settings, Shield, Coins, Briefcase, ShoppingBag, Radio, Gamepad2, HeartHandshake, MessageSquare, Pin, Activity, FileText, PanelLeftClose, PanelLeftOpen, ChevronsUpDown, X } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { useDialog } from '@/hooks/useDialog';
import { motion, AnimatePresence } from 'framer-motion';


interface SidebarProps {
  guildId: string; guildName: string; guildIcon: string | null;
  user?: { id: string; username: string; avatar: string | null; global_name?: string } | null;
  mobileOpen?: boolean; onCloseMobile?: () => void; onOpenServerSwitcher?: () => void;
  collapsed?: boolean; onToggleCollapse?: () => void;
}
export const navigation = [
  { group: 'Server', items: [['Overview', '', LayoutDashboard], ['General settings', '/general', Settings], ['Permissions & rules', '/permissions', Shield], ['Custom commands', '/commands', FileText]] },
  { group: 'Economy', items: [['Economy & rewards', '/economy', Coins], ['Role salaries', '/income', Briefcase], ['Store catalog', '/store', ShoppingBag], ['Minigames', '/games', Gamepad2]] },
  { group: 'Voice', items: [['Private voice', '/pvc', Radio], ['Gaming LFG', '/gaming', Gamepad2]] },
  { group: 'Community', items: [['Welcome greetings', '/welcome', HeartHandshake], ['Community tools', '/community', MessageSquare], ['Sticky notices', '/sticky', Pin]] },
  { group: 'Insights & system', items: [['Audit log', '/permissions?tab=audit', FileText], ['Bot status & integrations', '/developers', Activity]] },
] as const;
export function Sidebar({ guildId, guildName, guildIcon, mobileOpen = false, onCloseMobile, onOpenServerSwitcher, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname(); const search = useSearchParams();
  const { isOwner, userPermissions } = useGuildData();
  const [compact, setCompact] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const isCompact = collapsed ?? compact;
  useEffect(() => { setCompact(localStorage.getItem('hawk_sidebar_collapsed') === 'true'); }, []);
  const toggle = () => { if (onToggleCollapse) onToggleCollapse(); else { setCompact(!compact); localStorage.setItem('hawk_sidebar_collapsed', String(!compact)); } };
  useDialog(mobileOpen, drawer, () => onCloseMobile?.());
  const content = (mobile: boolean) => {
    const small = isCompact && !mobile;
    return <div className="flex h-full flex-col bg-sidebar border-r border-border">
      <div className="h-16 px-4 flex items-center justify-between shrink-0">
        <Link href={`/dashboard/${guildId}`} className="font-display text-xl font-semibold tracking-tight" aria-label="Hawk overview">{small ? 'H' : 'Hawk'}{!small && <span className="ml-2 text-[10px] uppercase tracking-[.16em] text-text-muted font-sans font-normal">Operations</span>}</Link>
        {mobile ? <button className="btn-ghost" aria-label="Close navigation" onClick={onCloseMobile}><X size={18}/></button> : !small && <button data-testid="sidebar-toggle" className="btn-ghost px-1" onClick={toggle} aria-label="Collapse sidebar"><PanelLeftClose size={16}/></button>}
      </div>
      <button className={`mx-3 mb-5 flex items-center gap-3 rounded-md bg-surface-3 p-3 text-left ${small ? 'justify-center mx-2 px-1' : ''}`} onClick={onOpenServerSwitcher} aria-label={`Switch server. Current server: ${guildName}`}>
        {guildIcon ? <img src={guildIcon} alt="" className="w-8 h-8 rounded-md"/> : <span className="w-8 h-8 rounded-md bg-surface-4 flex items-center justify-center font-display">{guildName.slice(0, 1)}</span>}
        {!small && <><span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{guildName}</span><span className="text-xs text-text-muted">Server workspace</span></span><ChevronsUpDown size={14} className="text-text-muted"/></>}
      </button>
      <HawkScrollArea className="flex-1 px-3 pb-4" aria-label="Server navigation">
        <nav aria-label="Main navigation" className="space-y-5">{navigation.map(group => <div key={group.group}>
          {!small && <div className="px-3 mb-2 text-[10px] uppercase tracking-[.12em] text-text-muted font-medium">{group.group}</div>}
          <div className="space-y-1">{group.items.map(([label, path, Icon]) => {
            const [route, query] = path.split('?');
            const active = pathname === `/dashboard/${guildId}${route}` && (query ? search.get('tab') === new URLSearchParams(query).get('tab') : !search.get('tab'));
            return <Link key={path} href={`/dashboard/${guildId}${path}`} onClick={() => onCloseMobile?.()} title={small ? label : undefined} aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 min-h-9 rounded-md px-3 text-[13px] transition-colors ${small ? 'justify-center px-1' : ''} ${active ? 'bg-sidebar-active text-text-primary shadow-tactile-btn' : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'}`}>
              <Icon size={16} aria-hidden="true" className="shrink-0"/>{!small && <span>{label}</span>}{small && <span className="sr-only">{label}</span>}
            </Link>;
          })}</div>
        </div>)}</nav>
      </HawkScrollArea>
      <div className="p-4 border-t border-border text-xs text-text-muted shrink-0">{small ? <button className="btn-ghost px-1" onClick={toggle} aria-label="Expand sidebar"><PanelLeftOpen size={18}/></button> : <><span className="block text-text-secondary">{isOwner ? 'Server owner' : userPermissions?.isAdmin ? 'Administrator' : 'Delegated access'}</span><span className="font-mono text-[10px] break-all">{guildId}</span></>}</div>
    </div>;
  };
  return <>
    <aside className={`hidden lg:block shrink-0 h-full ${isCompact ? 'w-[72px]' : 'w-[240px]'}`}>{content(false)}</aside>
    <AnimatePresence>{mobileOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile}/><div ref={drawer} role="dialog" aria-modal="true" aria-label="Navigation" tabIndex={-1} className="relative h-full w-[min(300px,88vw)]">{content(true)}</div></motion.div>}</AnimatePresence>
  </>;
}
