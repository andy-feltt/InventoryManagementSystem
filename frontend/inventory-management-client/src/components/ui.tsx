import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Button({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-[#e84416] text-white hover:bg-[#cf3810]',
        variant === 'secondary' && 'border border-[#d89a5a] bg-[#fffaf0] text-[#684134] hover:bg-[#f4e6b8]',
        variant === 'danger' && 'bg-[#8b3f31] text-white hover:bg-[#713328]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full rounded-md border border-[#d9cf93] bg-[#fffaf0] px-3 py-2 text-sm text-[#684134] outline-none placeholder:text-[#9b735f] focus:border-[#e84416] focus:ring-2 focus:ring-[#dfd79d]" {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full rounded-md border border-[#d9cf93] bg-[#fffaf0] px-3 py-2 text-sm text-[#684134] outline-none focus:border-[#e84416] focus:ring-2 focus:ring-[#dfd79d]" {...props} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-lg border border-[#d9cf93] bg-[#fffaf0] p-5 shadow-sm', className)}>{children}</section>;
}

export function Alert({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'error' | 'success' }) {
  return (
    <div className={clsx('rounded-md border px-3 py-2 text-sm', tone === 'warning' && 'border-[#d89a5a] bg-[#fff1cf] text-[#684134]', tone === 'error' && 'border-[#e84416] bg-[#fff1eb] text-[#8b2b1a]', tone === 'success' && 'border-[#dfd79d] bg-[#f7f5d4] text-[#684134]')}>
      {children}
    </div>
  );
}

export function LoadingSpinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#dfd79d] border-t-[#e84416]" aria-label="Loading" />;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#3d241d]/55 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-[#fffaf0] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9cf93] px-5 py-4">
          <h2 className="text-base font-semibold text-[#684134]">{title}</h2>
          <button className="rounded-md p-1 text-[#8a5a45] hover:bg-[#f4e6b8]" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-[#d9cf93] bg-[#fffaf0]"><table className="min-w-full divide-y divide-[#eadfa9] text-sm text-[#684134]">{children}</table></div>;
}
