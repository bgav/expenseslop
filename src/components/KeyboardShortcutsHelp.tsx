import React, { useState } from 'react';
import { Keyboard, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function KeyboardShortcutsHelp() {
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem('kb_guide_expanded');
    // Default to closed (false) to keep sidebar tidy, but user preference is saved
    return stored === 'true';
  });

  const toggleExpand = () => {
    const nextVal = !isExpanded;
    setIsExpanded(nextVal);
    localStorage.setItem('kb_guide_expanded', String(nextVal));
  };

  const SHORTCUTS = [
    { keys: ['Alt', 'N'], desc: 'Focus Payee in sticky swift entry' },
    { keys: ['Alt', 'A'], desc: 'Add new account' },
    { keys: ['Alt', 'C'], desc: 'Open / toggle Categories panel' },
    { keys: ['Alt', 'R'], desc: 'Open / toggle Recurring Engine panel' },
    { keys: ['Alt', 'E'], desc: 'Export secure JSON Backup data' },
    { keys: ['Alt', 'I'], desc: 'Import JSON backup file' },
    { keys: ['Esc'], desc: 'Dismiss autocomplete lists / reset search' },
  ];

  return (
    <div 
      className={`lg:sticky lg:bottom-6 rounded transition-all duration-300 overflow-hidden z-10 ${
        isExpanded 
          ? 'bg-white border border-[#e4e2d9] shadow-sm' 
          : 'bg-transparent border border-transparent shadow-none'
      }`}
      id="keyboard-shortcuts-card"
    >
      {/* Header Button (Toggler) */}
      <button
        onClick={toggleExpand}
        className={`w-full flex items-center justify-between p-3.5 transition-all duration-200 cursor-pointer text-left select-none outline-none font-sans rounded ${
          isExpanded
            ? 'text-slate-900 font-semibold bg-slate-50/60 border-b border-slate-100'
            : 'bg-transparent text-slate-700 hover:bg-slate-200/40'
        }`}
        aria-expanded={isExpanded}
        aria-label="Toggle Keyboard shortcuts guide"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-sm ${isExpanded ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-650'}`}>
            <Keyboard size={15} />
          </div>
          <div>
            <span className="text-xs font-semibold block">Keyboard Shortcuts</span>
            <span className="text-[10px] font-mono text-slate-500">
              Swift guide & commands
            </span>
          </div>
        </div>
        <div className="pr-1">
          {isExpanded ? (
            <ChevronUp size={15} className="text-slate-500" />
          ) : (
            <ChevronDown size={15} className="text-slate-500" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-3.5 space-y-4">
              <div className="space-y-2.5">
                {SHORTCUTS.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs hover:bg-slate-50/70 rounded px-2 py-1 transition duration-150 gap-3">
                    <span className="font-sans text-slate-600 truncate">{s.desc}</span>
                    <div className="flex gap-1 shrink-0">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold shadow-sm block select-none"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-2.5 border-t border-slate-200 flex items-center gap-1.5 text-[10px] font-mono text-slate-500 select-none">
                <KeyRound size={12} className="text-sky-600 shrink-0" />
                <span>Optimized for mouse-free transaction logging.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
