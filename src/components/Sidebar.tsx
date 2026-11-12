import React, { useRef, useEffect, useState } from 'react';
import { PAGES } from '../utils/constants';
import { Icon } from './Icon';
import { ini } from '../utils/formatters';
import { ViewPage, Profile } from '../types';

interface SidebarProps {
  currentPage: ViewPage;
  onNavigate: (page: ViewPage) => void;
  profile: Profile | null;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  profile,
  theme,
  onToggleTheme,
  onLogout,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const [indStyle, setIndStyle] = useState<{ height: number; transform: string }>({
    height: 46,
    transform: 'translateY(0px)',
  });

  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector('button.on') as HTMLElement | null;
    if (activeBtn) {
      setIndStyle({
        height: activeBtn.offsetHeight,
        transform: `translateY(${activeBtn.offsetTop}px)`,
      });
    }
  }, [currentPage]);

  const initials = profile?.name ? ini(profile.name) : '?';

  return (
    <aside className="sb">
      <div className="lg">
        <div className="lgm">
          <Icon name="wallet" />
        </div>
        <span className="lgt">DUITKU</span>
      </div>

      <nav className="nv" id="nv" ref={navRef}>
        <span
          className="ind"
          style={{
            height: `${indStyle.height}px`,
            transform: indStyle.transform,
          }}
        />
        {PAGES.map(([k, n, i]) => (
          <button
            key={k}
            className={currentPage === k ? 'on' : ''}
            onClick={() => onNavigate(k as ViewPage)}
            data-v={k}
          >
            <Icon name={i} />
            <span>{n}</span>
          </button>
        ))}
      </nav>

      <div className="sbf">
        <div className="uc">
          <div
            className="av"
            id="sav"
            style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})` } : {}}
          >
            {profile?.avatar ? '' : initials}
          </div>
          <div>
            <b id="sun">{profile?.name || 'Pengguna'}</b>
            <small id="sue">{profile?.email || '-'}</small>
          </div>
        </div>

        <div className="sbr">
          <button
            id="thb"
            onClick={onToggleTheme}
            aria-label="Ganti tema"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            id="lob"
            onClick={onLogout}
            aria-label="Keluar"
          >
            <Icon name="out" />
          </button>
        </div>
      </div>
    </aside>
  );
};
