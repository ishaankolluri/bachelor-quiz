'use client';

import { Player } from '@/lib/types';

interface LeaderboardProps {
  players: Player[];
  title?: string;
  showContinue?: boolean;
  onContinue?: () => void;
}

export default function Leaderboard({ players, title = 'Leaderboard', showContinue, onContinue }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-lg">
      <h2 className="mb-4 text-center text-2xl font-bold">{title}</h2>
      <div className="space-y-2">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              i === 0
                ? 'border-yellow-500/50 bg-yellow-500/10'
                : 'border-card-border bg-card'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-foreground/40">
                {i + 1}.
              </span>
              <span className="text-lg font-medium">{player.name}</span>
            </div>
            <span className="text-xl font-bold text-accent">{player.score}</span>
          </div>
        ))}
      </div>
      {showContinue && onContinue && (
        <button
          onClick={onContinue}
          className="mt-6 w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark"
        >
          Next Question
        </button>
      )}
    </div>
  );
}
