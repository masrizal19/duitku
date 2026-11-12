import React from 'react';
import { ViewPage } from '../types';
import { Icon } from './Icon';

interface BottomNavProps {
  currentPage: ViewPage;
  onNavigate: (page: ViewPage) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, onOpenMore }) => {
  const isMorePage = ['utang', 'laporan', 'kategori', 'pengaturan'].includes(currentPage);

  return (
    <nav className="bn" id="bn">
      <button
        className={currentPage === 'dashboard' ? 'on' : ''}
        onClick={() => onNavigate('dashboard')}
      >
        <Icon name="home" />
        <span>Home</span>
      </button>

      <button
        className={currentPage === 'transaksi' ? 'on' : ''}
        onClick={() => onNavigate('transaksi')}
      >
        <Icon name="list" />
        <span>Transaksi</span>
      </button>

      <div className="fab">
        <button
          onClick={() => onNavigate('tambah')}
          aria-label="Catat transaksi"
        >
          <Icon name="plus" />
        </button>
        <span>Catat</span>
      </div>

      <button
        className={currentPage === 'dompet' ? 'on' : ''}
        onClick={() => onNavigate('dompet')}
      >
        <Icon name="wallet" />
        <span>Dompet</span>
      </button>

      <button
        className={isMorePage ? 'on' : ''}
        onClick={onOpenMore}
      >
        <Icon name="gear" />
        <span>Lainnya</span>
      </button>
    </nav>
  );
};
