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
    { keys: ['Shift', 'N'], desc: 'Add new transaction inline' },
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
          ? 'bg-[#202544] border border-white/10 shadow-sm' 
          : 'bg-transparent border border-transparent shadow-none'
      }`}
      id="keyboard-shortcuts-card"
    >
      {/* Header Button (Toggler) */}
      <button
        onClick={toggleExpand}
        className={`w-full flex items-center justify-between p-3.5 transition-all duration-200 cursor-pointer text-left select-none outline-none font-sans rounded ${
          isExpanded
            ? 'text-white font-semibold bg-white/5 border-b border-white/10'
            : 'bg-transparent text-slate-300 hover:bg-white/5'
        }`}
        aria-expanded={isExpanded}
        aria-label="Toggle Keyboard shortcuts guide"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-sm ${isExpanded ? 'bg-[#3b82f6] text-white' : 'bg-[#202544] text-slate-400'}`}>
            <Keyboard size={15} />
          </div>
          <div>
            <span className="text-xs font-semibold block text-white">Keyboard Shortcuts</span>
            <span className="text-[10px] font-mono text-slate-400">
              Swift guide & commands
            </span>
          </div>
        </div>
        <div className="pr-1">
          {isExpanded ? (
            <ChevronUp size={15} className="text-slate-400" />
          ) : (
            <ChevronDown size={15} className="text-slate-400" />
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
                  <div key={idx} className="flex items-center justify-between text-xs hover:bg-white/5 rounded px-2 py-1 transition duration-150 gap-3">
                    <span className="font-sans text-slate-300 truncate">{s.desc}</span>
                    <div className="flex gap-1 shrink-0">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="bg-[#131735]/80 border border-white/10 text-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold shadow-sm block select-none"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-2.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-slate-450 select-none">
                <KeyRound size={12} className="text-sky-400 shrink-0" />
                <span>Optimized for mouse-free transaction logging.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
