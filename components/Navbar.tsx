'use client';

import React from 'react';
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '14px 28px',
      background: 'rgba(10, 8, 6, 0.7)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(41, 37, 32, 0.4)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Link href="/" style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '20px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: '#f0ebe3',
        textDecoration: 'none',
      }}>
        <span style={{ color: '#c8a46b' }}>After</span>You
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link href="/missions/new" style={{
          fontSize: '13px',
          letterSpacing: '0.03em',
          color: 'rgba(240, 235, 227, 0.5)',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = '#f0ebe3'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(240, 235, 227, 0.5)'}
        >
          Missions
        </Link>
        <Link href="/sessions" style={{
          fontSize: '13px',
          letterSpacing: '0.03em',
          color: 'rgba(240, 235, 227, 0.5)',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = '#f0ebe3'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(240, 235, 227, 0.5)'}
        >
          Sessions
        </Link>
        <Link href="/missions/new" style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '7px 18px',
          borderRadius: '50px',
          border: '1px solid rgba(200, 164, 107, 0.25)',
          color: '#c8a46b',
          textDecoration: 'none',
          transition: 'background 0.2s, border-color 0.2s',
        }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.background = 'rgba(200, 164, 107, 0.08)';
            (e.target as HTMLElement).style.borderColor = 'rgba(200, 164, 107, 0.4)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.background = 'transparent';
            (e.target as HTMLElement).style.borderColor = 'rgba(200, 164, 107, 0.25)';
          }}
        >
          New Mission
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
