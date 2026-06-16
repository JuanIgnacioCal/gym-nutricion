'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Plus, Search, Heart } from 'lucide-react';

const ITEMS = [
  { href: '/plan', label: 'Plan', Icon: ClipboardList },
  { href: '/registrar', label: 'Registrar', Icon: Plus },
  { href: '/buscar', label: 'Buscar', Icon: Search },
  { href: '/favoritos', label: 'Favoritos', Icon: Heart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        height: 'var(--alto-nav)',
        background: 'var(--color-superficie)',
        borderTop: '1px solid var(--color-borde)',
      }}
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const activo = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors"
            style={{ color: activo ? 'var(--color-primario)' : 'var(--color-texto-sec)' }}
          >
            <Icon size={22} strokeWidth={activo ? 2.5 : 2} />
            <span style={{ fontWeight: activo ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
