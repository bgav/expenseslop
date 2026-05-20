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
      className="lg:sticky lg:bottom-6 bg-white rounded border border-[#e4e2d9] shadow-sm overflow-hidden z-10 transition-all duration-300" 
      id="keyboard-shortcuts-card"
    >
      {/* Header Button (Toggler) */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-150 cursor-pointer text-left select-none outline-none focus:ring-1 focus:ring-sky-500/30 font-sans"
        aria-expanded={isExpanded}
        aria-label="Toggle Keyboard shortcuts guide"
      >
        <div className="flex items-center gap-2">
          <Keyboard size={15} className="text-slate-400 shrink-0" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
            Keyboard Swift Guide
          </h4>
        </div>
        <div>
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
            <div className="p-4 pt-0 space-y-4">
              <div className="border-t border-slate-200 mt-1"></div>
              
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
