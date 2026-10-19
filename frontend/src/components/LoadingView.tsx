import { hi } from '../strings/hi';

export function LoadingView() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-8 border-green-200 border-t-green-700" />
      <p className="text-3xl font-bold text-green-800">{hi.checking}</p>
      <p className="text-lg text-gray-600">{hi.checkingHint}</p>
    </div>
  );
}
