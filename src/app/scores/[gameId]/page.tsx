'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getGame, getPlayers } from '@/lib/queries';
import { Game, Player } from '@/lib/types';
import FinalResults from '@/components/FinalResults';

export default function ScoresPage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [g, p] = await Promise.all([getGame(gameId), getPlayers(gameId)]);
      setGame(g);
      setPlayers(p);
      setLoading(false);
    }
    load();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-danger">Game not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <FinalResults players={players} />
    </div>
  );
}
