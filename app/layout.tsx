import React from 'react';
import Navbar from '../components/Navbar';
import './globals.css';
import './workspace.css';

export const metadata = {
  title: 'AfterYou — Nova',
  description: 'An autonomous AI coworker. Delegate work. Nova executes. Wake up to results.',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar />
        <main className="page-enter" style={{ minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
};

export default Layout;
