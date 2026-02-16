'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGameByCode, joinGame } from '@/lib/queries';
import { createHostGame } from './actions';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'join' | 'host'>('choose');
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const game = await getGameByCode(gameCode);
      if (!game) {
        setError('Game not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      if (game.status !== 'lobby') {
        setError('This game has already started.');
        setLoading(false);
        return;
      }
      const player = await joinGame(game.id, name);
      // Store player ID in sessionStorage so the player page can identify them
      sessionStorage.setItem('playerId', player.id);
      sessionStorage.setItem('playerName', player.name);
      router.push(`/play/${game.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await createHostGame(masterPin);
      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      const { gameId } = result;
      // Store PIN in sessionStorage so host doesn't need to re-enter on host page
      sessionStorage.setItem(`host_pin_${gameId}`, masterPin);
      router.push(`/host/${gameId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-4xl font-bold">Bachelor Quiz</h1>
        <p className="mb-8 text-center text-foreground/60">
          How well do you know the bride-to-be?
        </p>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark"
            >
              Join Game
            </button>
            <button
              onClick={() => setMode('host')}
              className="w-full rounded-full border border-card-border bg-card py-3 text-lg font-bold transition-colors hover:bg-card-border"
            >
              Host Game
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoFocus
              className="w-full rounded-lg border border-card-border bg-card px-4 py-3 text-lg text-foreground placeholder-foreground/30 outline-none focus:border-accent"
            />
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Game code"
              required
              maxLength={6}
              className="w-full rounded-lg border border-card-border bg-card px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder-foreground/30 outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !name.trim() || !gameCode.trim()}
              className="w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('choose'); setError(''); }}
              className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60"
            >
              Back
            </button>
          </form>
        )}

        {mode === 'host' && (
          <form onSubmit={handleCreateGame} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
              placeholder="Host PIN"
              required
              autoFocus
              maxLength={8}
              className="w-full rounded-lg border border-card-border bg-card px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder-foreground/30 outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !masterPin.trim()}
              className="w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('choose'); setError(''); }}
              className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60"
            >
              Back
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-danger">{error}</p>
        )}
      </div>
    </div>
  );
}
