'use client';

import { Player } from '@/lib/types';

interface FinalResultsProps {
  players: Player[];
  onReset?: () => void;
  isHost?: boolean;
}

export default function FinalResults({ players, onReset, isHost }: FinalResultsProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const lastPlace = sorted[sorted.length - 1];
  const firstPlace = sorted[0];

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <h1 className="text-3xl font-bold">Final Results</h1>

      {/* Winner */}
      {firstPlace && (
        <div className="text-center">
          <p className="text-6xl">👑</p>
          <p className="mt-2 text-2xl font-bold text-gold">{firstPlace.name}</p>
          <p className="text-lg text-foreground/60">{firstPlace.score} points — Winner!</p>
        </div>
      )}

      {/* Full leaderboard */}
      <div className="w-full max-w-md space-y-2">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              player.id === lastPlace?.id
                ? 'border-danger/50 bg-danger/10'
                : i === 0
                ? 'border-gold/50 bg-gold/10'
                : 'border-card-border bg-card'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-foreground/40">{i + 1}.</span>
              <span className="text-lg font-medium">{player.name}</span>
            </div>
            <span className="text-xl font-bold text-accent">{player.score}</span>
          </div>
        ))}
      </div>

      {/* Last place callout */}
      {lastPlace && sorted.length > 1 && (
        <div className="rounded-xl border-2 border-danger bg-danger/10 px-8 py-6 text-center">
          <p className="text-4xl">💀</p>
          <p className="mt-2 text-xl font-bold text-danger">{lastPlace.name}</p>
          <p className="mt-1 text-lg text-foreground/60">
            Last place — time for your punishment!
          </p>
        </div>
      )}

      {isHost && onReset && (
        <button
          onClick={onReset}
          className="rounded-full border border-card-border bg-card px-8 py-3 font-bold transition-colors hover:bg-card-border"
        >
          Reset & Play Again
        </button>
      )}
    </div>
  );
}
