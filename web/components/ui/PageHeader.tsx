import React from 'react';
import Link from 'next/link';
export function PageHeader({ title, description, guildId, section, actions }: {
  title: string; description: string; guildId: string; section?: string; actions?: React.ReactNode;
}) {
  return <header className="page-header" data-animate-section>
    <div><nav aria-label="Breadcrumb" className="breadcrumb"><Link href={`/dashboard/${guildId}`}>Server</Link><span aria-hidden="true">/</span><span>{section || title}</span></nav>
      <h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>;
}
