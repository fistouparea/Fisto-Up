import { hi } from '../strings/hi';

export function Header() {
  return (
    <header className="bg-green-700 px-4 py-4 text-white">
      <h1 className="text-3xl font-bold">🌱 {hi.appName}</h1>
      <p className="mt-1 text-lg text-green-50">{hi.appTagline}</p>
    </header>
  );
}
