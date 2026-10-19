import { routes, type Route } from '../hooks/useHashRoute';
import { hi } from '../strings/hi';

interface HeaderProps {
  route: Route;
  /** Called when "नई जाँच" is tapped, so a new check starts even if that tab is already open. */
  onNewCheck: () => void;
}

export function Header({ route, onNewCheck }: HeaderProps) {
  const onHistory = route.name !== 'diagnose';
  return (
    <header className="bg-green-700 px-4 pt-4 text-white">
      <h1 className="text-3xl font-bold">🌱 {hi.appName}</h1>
      <p className="mt-1 text-lg text-green-50">{hi.appTagline}</p>
      <nav className="mt-3 flex gap-2">
        <NavTab href={routes.diagnose} active={!onHistory} label={`📷 ${hi.nav.newCheck}`} onClick={onNewCheck} />
        <NavTab href={routes.history} active={onHistory} label={`📋 ${hi.nav.history}`} />
      </nav>
    </header>
  );
}

interface NavTabProps {
  href: string;
  active: boolean;
  label: string;
  onClick?: () => void;
}

function NavTab({ href, active, label, onClick }: NavTabProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-12 flex-1 items-center justify-center rounded-t-xl text-xl font-bold ${
        active ? 'bg-white text-green-800' : 'bg-green-800 text-green-50'
      }`}
    >
      {label}
    </a>
  );
}
