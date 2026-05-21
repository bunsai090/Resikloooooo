import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

const NO_FOOTER_ROUTES = ['/map'];

export function MainLayout() {
  const { pathname } = useLocation();
  const hideFooter = NO_FOOTER_ROUTES.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8F5] font-sans selection:bg-primary/20">
      <TopNav />
      <main className={`flex-1 ${hideFooter ? '' : 'pb-24 md:pb-0'}`}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}