import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-[100svh] flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 h-14 bg-slate-900 border-t border-slate-800 flex z-30">
        <NavItem to="/" label="Dashboard" icon="⊞" />
        <NavItem to="/chat" label="Chat" icon="✦" />
        <NavItem to="/settings" label="Settings" icon="⚙" />
      </nav>
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${
          isActive ? 'text-purple-300' : 'text-slate-500'
        }`
      }
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
