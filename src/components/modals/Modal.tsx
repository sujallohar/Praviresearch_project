import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dark Dim Backdrop - Clean solid opacity, NO blur filter to prevent viewport blur issues */}
      <div 
        className="fixed inset-0 bg-slate-900/70 transition-opacity z-40" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container — full-screen on mobile, centered card on desktop */}
      <div className="relative z-50 flex min-h-full items-end sm:items-center justify-center sm:p-4 lg:p-6 pointer-events-none">
        <div 
          className={`
            w-full ${maxWidthClass} pointer-events-auto transform overflow-hidden 
            bg-white text-left align-middle shadow-2xl border-t sm:border border-slate-200 
            transition-all
            rounded-t-2xl sm:rounded-2xl
            max-h-[95vh] sm:max-h-[90vh]
            flex flex-col
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — touch-friendly on mobile */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 bg-slate-50 flex-shrink-0">
            {/* Mobile drag handle indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 rounded-full sm:hidden" />
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 sm:p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body — scrollable with safe bottom padding for mobile */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 bg-white pb-8 sm:pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
