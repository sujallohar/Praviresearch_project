import React from 'react';
import { 
  ExternalLink, ShieldCheck, 
  Sparkles, Download, Smartphone, 
  Server, Database, Code2, Globe2, Layers, 
  CheckCircle2, Award, Heart
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.81a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
  </svg>
);

export const About: React.FC = () => {
  const handleOpenInstall = () => {
    window.dispatchEvent(new CustomEvent('govasset:open-install'));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Developer & Project Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-800">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8 justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* App Icon / Shield Emblem */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-xl bg-slate-950 p-0.5">
                <img 
                  src="/icon-192.png" 
                  alt="GovAsset 360 Official Icon" 
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon-192.svg';
                  }}
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ring-2 ring-slate-900">
                v2.0
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  GovAsset 360
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Municipal Infrastructure OS
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                A modern, human-centric municipal infrastructure governance operating system. Engineered for real-time asset tracking, AI defect vision, transparent public auditing, and zero-cost cloud reliability.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Free Architecture
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" /> PWA Mobile Native
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" /> Edge AI Vision
                </span>
              </div>
            </div>
          </div>

          {/* Direct Install PWA Action */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={handleOpenInstall}
              className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install Mobile Web App</span>
            </button>
            <p className="text-[10px] text-center md:text-right text-slate-400">
              No App Store or Play Store needed • 100% Free
            </p>
          </div>
        </div>
      </div>

      {/* 2. Developer Profile Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">
          <Award className="w-4 h-4" /> Creator & Systems Architect
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Sujal Lohar
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                Lead Full-Stack & AI Systems Engineer
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Passionate about designing and deploying scalable, mission-critical civic systems, intelligent automated workflows, and high-performance web applications that empower both municipal authorities and everyday citizens.
            </p>
          </div>

          {/* Social & Connect Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/sujallohar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0077b5] hover:bg-[#006097] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all hover:shadow-md"
            >
              <LinkedinIcon className="w-4 h-4" />
              <span>Connect on LinkedIn</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/sujallohar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all hover:shadow-md"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub Profile</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* Project GitHub Repository Highlight */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shrink-0">
              <Code2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Official Project Repository (Open Source)
              </span>
              <span className="text-xs text-slate-500 font-mono">
                github.com/sujallohar/Praviresearch_project
              </span>
            </div>
          </div>

          <a
            href="https://github.com/sujallohar/Praviresearch_project"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors shrink-0"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>View Source Code</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* 3. Core Pillars & World-Class Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Pillar 1 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Progressive Web App (PWA)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Installable instantly on any smartphone (iOS, Android) and desktop computer directly from the web browser. Zero app store developer fees, full-screen native standalone mode, and instant automatic updates.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> No App Store accounts required
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Edge AI Defect Vision
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Powered by Google MediaPipe running directly in the browser via WebAssembly and WebGL. Audits roads, concrete, and water pipes for structural defects via live camera with zero cloud API costs.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Client-side neural inference ($0 cost)
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Zero-Cost Cloud Architecture
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Built on Google Firebase Spark tier providing 50,000 reads, 20,000 writes/day for $0. Features idempotent data seeding, offline IndexedDB sync queue, and resilient data integrity.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sustainable civic technology
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Free RBAC Request & Approvals
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Normal citizens can use the portal freely. When elevated field authority is needed, a formal request triggers to the Department Head/Admin, who can review and grant credentials with one click.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Audit-logged authority approvals
          </div>
        </div>

        {/* Pillar 5 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Physical QR Tagging
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generates printable municipal laminate badges with GPS coordinates and universal HTTPS URLs. Scannable with any standard smartphone camera or the portal's built-in laser reticle scanner.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-purple-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Real-world field verification
          </div>
        </div>

        {/* Pillar 6 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Bulk CSV & Excel Imports
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorities can import hundreds of municipal infrastructure assets directly using CSV or Excel spreadsheets, with automatic column detection, live preview, and batch Firestore writing.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Enterprise data interoperability
          </div>
        </div>

      </div>

      {/* 4. Complete Technology Stack Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" /> Technology Stack & Engineering Standards
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Engineered using industry-leading modern web standards and high-reliability frameworks.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          {[
            { name: 'React 19 & TypeScript', desc: 'Type-Safe Frontend Core', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { name: 'Vite 8 & Tailwind CSS', desc: 'Ultra-Fast Build Engine', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
            { name: 'Google Cloud Firestore', desc: 'Real-Time NoSQL Database', color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { name: 'Google MediaPipe AI', desc: 'On-Device Computer Vision', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { name: 'PWA & Service Worker', desc: 'Offline-First Web App', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { name: 'Leaflet GIS Maps', desc: 'Geospatial Asset Tracking', color: 'bg-green-50 text-green-700 border-green-200' },
            { name: 'Html5-QRCode & WebAudio', desc: 'Camera Reticle & Feedback', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { name: 'jsPDF & AutoTable', desc: 'Cryptographic Audit Reports', color: 'bg-rose-50 text-rose-700 border-rose-200' },
          ].map((tech) => (
            <div key={tech.name} className={`p-3 rounded-xl border ${tech.color} flex flex-col justify-between`}>
              <span className="font-bold text-xs">{tech.name}</span>
              <span className="text-[10px] opacity-80 mt-1">{tech.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Footer Statement */}
      <div className="text-center py-6 text-xs text-slate-400 space-y-1">
        <p className="flex items-center justify-center gap-1">
          Designed and Developed with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <strong className="text-slate-700">Sujal Lohar</strong>.
        </p>
        <p className="text-[11px]">
          GovAsset 360 © {new Date().getFullYear()} • Dedicated to Modern Public Infrastructure Governance.
        </p>
      </div>

    </div>
  );
};
