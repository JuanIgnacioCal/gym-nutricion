'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, CalendarDays, Plus, Search, Heart } from 'lucide-react';

const ITEMS = [
  { href: '/plan', label: 'Plan', Icon: ClipboardList },
  { href: '/semana', label: 'Semana', Icon: CalendarDays },
  { href: '/registrar', label: 'Registrar', Icon: Plus },
  { href: '/buscar', label: 'Buscar', Icon: Search },
  { href: '/favoritos', label: 'Favoritos', Icon: Heart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-stretch gap-1 px-2 py-2"
      style={{
        borderRadius: 30,
        maxWidth: 'calc(100% - 20px)',
        boxShadow: '0 18px 44px -12px rgba(0,0,0,.5)',
      }}
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const activo = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all"
            style={{
              minWidth: 52,
              borderRadius: 21,
              background: activo ? 'var(--gradiente-dorado)' : 'transparent',
              boxShadow: activo ? 'var(--glow-dorado)' : 'none',
              color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto-sec)',
            }}
          >
            <Icon size={20} strokeWidth={activo ? 2.6 : 2} />
            <span className="text-[10px]" style={{ fontWeight: activo ? 800 : 600, letterSpacing: '0.01em' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
