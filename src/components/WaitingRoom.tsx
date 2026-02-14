'use client';

import { Player } from '@/lib/types';

interface WaitingRoomProps {
  players: Player[];
  gameCode: string;
  isHost?: boolean;
  onStart?: () => void;
}

export default function WaitingRoom({ players, gameCode, isHost, onStart }: WaitingRoomProps) {
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-accent">Game Code</p>
        <p className="text-5xl font-bold tracking-wider">{gameCode}</p>
        <p className="mt-2 text-sm text-foreground/60">Share this code with your friends</p>
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-3 text-lg font-semibold">
          Players ({players.length})
        </h2>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="rounded-lg border border-card-border bg-card px-4 py-3 text-lg"
            >
              {player.name}
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-center text-foreground/40 py-8">Waiting for players to join...</p>
          )}
        </div>
      </div>

      {isHost && players.length > 0 && (
        <button
          onClick={onStart}
          className="mt-4 rounded-full bg-accent px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark"
        >
          Start Game
        </button>
      )}

      {!isHost && (
        <p className="animate-pulse text-foreground/60">Waiting for host to start...</p>
      )}
    </div>
  );
}
