import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, QrCode } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import type { Asset, Project, Issue } from '../types';

type SearchResult = {
  id: string;
  type: 'asset' | 'project' | 'issue';
  title: string;
  subtitle: string;
  path: string;
};

interface GlobalSearchProps {
  onScanQr?: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onScanQr }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDB = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      
      try {
        const term = searchTerm.toLowerCase();
        
        // Parallel queries
        const [assetsSnap, projectsSnap, issuesSnap] = await Promise.all([
          getDocs(query(collection(db, 'assets'), limit(20))),
          getDocs(query(collection(db, 'projects'), limit(20))),
          getDocs(query(collection(db, 'issues'), limit(20)))
        ]);

        // Client-side filtering for MVP (since Firestore text search is limited without an extension)
        const assetResults = assetsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Asset))
          .filter(a => a.name.toLowerCase().includes(term) || a.type.toLowerCase().includes(term))
          .map(a => ({ id: a.id || '', type: 'asset' as const, title: a.name, subtitle: `${a.type} • ${a.status}`, path: `/assets/${a.id}` }));

        const projectResults = projectsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Project))
          .filter(p => p.name.toLowerCase().includes(term))
          .map(p => ({ id: p.id || '', type: 'project' as const, title: p.name, subtitle: `${p.status} • $${p.budget.toLocaleString()}`, path: `/projects` }));

        const issueResults = issuesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Issue))
          .filter(i => i.title.toLowerCase().includes(term) || i.status.toLowerCase().includes(term))
          .map(i => ({ id: i.id || '', type: 'issue' as const, title: i.title, subtitle: `${i.severity} Severity • ${i.status}`, path: `/issues` }));

        setResults([...assetResults, ...projectResults, ...issueResults].slice(0, 10));
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchDB, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
          <Search className="h-4 sm:h-5 w-4 sm:w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-8 sm:pl-10 pr-8 sm:pr-4 py-1.5 sm:py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm transition-colors"
          placeholder="Search assets, projects..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          </div>
        )}
        {!loading && onScanQr && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScanQr();
            }}
            className="absolute inset-y-0 right-0 pr-2 sm:pr-2.5 flex items-center text-slate-400 hover:text-blue-600 transition-colors p-1"
            title="Scan Physical Asset QR Tag"
            aria-label="Scan Asset QR Code"
          >
            <QrCode className="h-4 w-4 text-slate-500 hover:text-blue-600" />
          </button>
        )}
      </div>

      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result.path)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 capitalize">
                    {result.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{result.subtitle}</p>
              </button>
            ))
          ) : (
            !loading && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No results found for "{searchTerm}"
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
