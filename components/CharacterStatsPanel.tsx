"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

export interface CharacterStat {
  character: string;
  shots: number;
  scenes: number;
}

interface CharacterStatsPanelProps {
  characterStats: CharacterStat[];
}

export function CharacterStatsPanel({ characterStats }: CharacterStatsPanelProps) {
  const [open, setOpen] = useState(characterStats.length > 0);

  if (characterStats.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-800">Character Coverage</span>
          <span className="text-xs text-slate-400">({characterStats.length})</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2">Character</th>
                <th className="px-4 py-2 text-right">Shots</th>
                <th className="px-4 py-2 text-right">Scenes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {characterStats.map((row) => (
                <tr key={row.character} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.character}</td>
                  <td className="px-4 py-2 text-right text-slate-600 tabular-nums">{row.shots}</td>
                  <td className="px-4 py-2 text-right text-slate-600 tabular-nums">{row.scenes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
