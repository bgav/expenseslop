import React from 'react';
import { Keyboard, KeyRound } from 'lucide-react';

export default function KeyboardShortcutsHelp() {
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
    <div className="bg-white rounded border border-[#e4e2d9] p-5 shadow-sm space-y-4" id="keyboard-shortcuts-card">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Keyboard size={15} className="text-slate-400" />
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-705">
          Keyboard Swift Guide
        </h4>
      </div>

      <div className="space-y-3">
        {SHORTCUTS.map((s, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs hover:bg-slate-50 rounded-sm px-2 py-0.5 transition duration-150">
            <span className="font-sans text-slate-600">{s.desc}</span>
            <div className="flex gap-1">
              {s.keys.map((k, kIdx) => (
                <kbd
                  key={kIdx}
                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-sm px-1.5 py-0.5 text-[10px] font-mono font-semibold shadow-sm block"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[10px] font-mono text-slate-555">
        <KeyRound size={12} className="text-sky-600" />
        <span>Optimized for mouse-free transaction logging.</span>
      </div>
    </div>
  );
}
