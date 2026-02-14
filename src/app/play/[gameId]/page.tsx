'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getGame, getQuestions, getPlayers, submitAnswer, getPlayerAnswer } from '@/lib/queries';
import { Game, Question, Player } from '@/lib/types';
import WaitingRoom from '@/components/WaitingRoom';
import QuestionCard from '@/components/QuestionCard';
import AnswerInput from '@/components/AnswerInput';
import Leaderboard from '@/components/Leaderboard';
import FinalResults from '@/components/FinalResults';

export default function PlayPage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[game?.current_question ?? 0] ?? null;

  const loadData = useCallback(async () => {
    const [g, q, p] = await Promise.all([
      getGame(gameId),
      getQuestions(gameId),
      getPlayers(gameId),
    ]);
    setGame(g);
    setQuestions(q);
    setPlayers(p);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    const id = sessionStorage.getItem('playerId');
    setPlayerId(id);
    loadData();
  }, [loadData]);

  // Check if player already answered current question (e.g. after refresh or redo)
  useEffect(() => {
    if (!playerId || !currentQuestion) return;
    getPlayerAnswer(playerId, currentQuestion.id).then((answer) => {
      if (answer) {
        setSubmitted(true);
        setCurrentAnswer(answer.answer_text);
      } else {
        setSubmitted(false);
        setCurrentAnswer('');
      }
    });
  }, [playerId, currentQuestion?.id]);

  // Real-time: listen for game state changes
  useEffect(() => {
    const gameSub = supabase
      .channel(`player-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as Game;
          setGame(updated);
          // Reset answer state when moving to a new question
          if (updated.status === 'active') {
            setSubmitted(false);
            setCurrentAnswer('');
          }
        }
      )
      .subscribe();

    const playerSub = supabase
      .channel(`player-players-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => {
          getPlayers(gameId).then(setPlayers);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameSub);
      supabase.removeChannel(playerSub);
    };
  }, [gameId]);

  const handleSubmitAnswer = async (answerText: string) => {
    if (!playerId || !currentQuestion) return;
    await submitAnswer(playerId, currentQuestion.id, answerText);
    setSubmitted(true);
    setCurrentAnswer(answerText);
  };

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
      {/* LOBBY */}
      {game.status === 'lobby' && (
        <WaitingRoom players={players} gameCode={game.code} />
      )}

      {/* ACTIVE: Answer the question */}
      {game.status === 'active' && currentQuestion && (
        <div className="flex flex-col items-center gap-6">
          <QuestionCard
            questionNumber={game.current_question + 1}
            totalQuestions={questions.length}
            questionText={currentQuestion.text}
          />
          <AnswerInput
            key={currentQuestion.id}
            onSubmit={handleSubmitAnswer}
            submitted={submitted}
            currentAnswer={currentAnswer}
          />
        </div>
      )}

      {/* GRADING: Waiting for host */}
      {game.status === 'grading' && (
        <div className="text-center">
          <p className="animate-pulse text-lg text-foreground/60">
            Host is grading answers...
          </p>
        </div>
      )}

      {/* REVEALING: Show scores */}
      {game.status === 'revealing' && (
        <Leaderboard
          players={players}
          title={`After Question ${game.current_question + 1}`}
        />
      )}

      {/* FINISHED */}
      {game.status === 'finished' && (
        <FinalResults players={players} />
      )}
    </div>
  );
}
