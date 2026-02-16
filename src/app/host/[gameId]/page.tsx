'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getGame,
  getQuestions,
  getPlayers,
  updateGameStatus,
  getAnswersForQuestion,
  gradeAnswer,
  updatePlayerScore,
  resetGame,
  redoQuestion,
} from '@/lib/queries';
import { Game, Question, Player, Answer } from '@/lib/types';
import WaitingRoom from '@/components/WaitingRoom';
import GradingPanel from '@/components/GradingPanel';
import Leaderboard from '@/components/Leaderboard';
import FinalResults from '@/components/FinalResults';

interface AnswerWithPlayer extends Answer {
  player: Player;
}

export default function HostPage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<AnswerWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[game?.current_question ?? 0] ?? null;

  // Check sessionStorage for existing PIN verification
  useEffect(() => {
    const stored = sessionStorage.getItem(`host_pin_${gameId}`);
    if (stored) {
      setPinVerified(true);
    }
  }, [gameId]);

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

    // Load answers for current question if game is active/grading
    if (g && (g.status === 'grading' || g.status === 'active') && q[g.current_question]) {
      const a = await getAnswersForQuestion(q[g.current_question].id);
      setAnswers(a);
    }
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time: listen for new players
  useEffect(() => {
    const playerSub = supabase
      .channel(`host-players-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => {
          getPlayers(gameId).then(setPlayers);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(playerSub); };
  }, [gameId]);

  // Real-time: listen for answers on current question
  useEffect(() => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;

    const answerSub = supabase
      .channel(`host-answers-${questionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answers', filter: `question_id=eq.${questionId}` },
        () => {
          getAnswersForQuestion(questionId).then(setAnswers);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(answerSub); };
  }, [currentQuestion?.id]);

  // Polling fallback: refresh players during lobby, answers+players during active/grading
  useEffect(() => {
    if (!game) return;
    if (game.status === 'lobby') {
      const interval = setInterval(() => {
        getPlayers(gameId).then(setPlayers);
      }, 3000);
      return () => clearInterval(interval);
    }
    if ((game.status === 'active' || game.status === 'grading') && currentQuestion) {
      const interval = setInterval(() => {
        getAnswersForQuestion(currentQuestion.id).then(setAnswers);
        getPlayers(gameId).then(setPlayers);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentQuestion?.id, game?.status, gameId]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;
    if (pinInput === game.host_pin) {
      sessionStorage.setItem(`host_pin_${gameId}`, pinInput);
      setPinVerified(true);
      setPinError('');
    } else {
      setPinError('Wrong PIN. Try again.');
    }
  };

  const handleStartGame = async () => {
    if (questions.length === 0) return;
    await updateGameStatus(gameId, 'active', 0);
    await loadData();
  };

  const handleGrade = async (answerId: string, isCorrect: boolean) => {
    await gradeAnswer(answerId, isCorrect);
    setAnswers((prev) =>
      prev.map((a) => (a.id === answerId ? { ...a, is_correct: isCorrect } : a))
    );
  };

  const handleFinishGrading = async () => {
    for (const answer of answers) {
      if (answer.is_correct) {
        const player = players.find((p) => p.id === answer.player_id);
        if (player) {
          await updatePlayerScore(player.id, player.score + 1);
        }
      }
    }
    const updatedPlayers = await getPlayers(gameId);
    setPlayers(updatedPlayers);
    await updateGameStatus(gameId, 'revealing');
    setGame((prev) => prev ? { ...prev, status: 'revealing' } : prev);
  };

  const handleNextQuestion = async () => {
    const nextIdx = (game?.current_question ?? 0) + 1;
    if (nextIdx >= questions.length) {
      await updateGameStatus(gameId, 'finished');
      setGame((prev) => prev ? { ...prev, status: 'finished' } : prev);
    } else {
      await updateGameStatus(gameId, 'active', nextIdx);
      setGame((prev) => prev ? { ...prev, status: 'active', current_question: nextIdx } : prev);
      const a = await getAnswersForQuestion(questions[nextIdx].id);
      setAnswers(a);
    }
  };

  const handleMoveToGrading = async () => {
    await updateGameStatus(gameId, 'grading');
    setGame((prev) => prev ? { ...prev, status: 'grading' } : prev);
    if (currentQuestion) {
      const a = await getAnswersForQuestion(currentQuestion.id);
      setAnswers(a);
    }
  };

  const handleRedoQuestion = async () => {
    if (!currentQuestion || !game) return;
    await redoQuestion(currentQuestion.id, gameId, game.current_question);
    setGame((prev) => prev ? { ...prev, status: 'active' } : prev);
    setAnswers([]);
    const updatedPlayers = await getPlayers(gameId);
    setPlayers(updatedPlayers);
  };

  const handleReset = async () => {
    await resetGame(gameId);
    await loadData();
    setAnswers([]);
  };

  const handleNuke = async () => {
    if (!confirm('Delete this entire game? Everyone will need to rejoin.')) return;
    await resetGame(gameId);
    await supabase.from('games').delete().eq('id', gameId);
    window.location.href = '/';
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

  // PIN gate — show PIN entry before any host content
  if (!pinVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-center text-2xl font-bold">Host Access</h1>
          <p className="mb-6 text-center text-foreground/60">
            Enter the host PIN to continue.
          </p>
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN"
              autoFocus
              maxLength={8}
              className="w-full rounded-lg border border-card-border bg-card px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder-foreground/30 outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!pinInput.trim()}
              className="w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
            >
              Enter
            </button>
            {pinError && (
              <p className="text-center text-sm text-danger">{pinError}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6">
      <div className="mb-4 w-full max-w-lg">
        <p className="text-center text-sm text-foreground/40">HOST VIEW</p>
      </div>

      {/* LOBBY: Show question count, players, and start button */}
      {game.status === 'lobby' && (
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-lg border border-card-border bg-card px-4 py-4 text-center">
            <p className="text-lg font-semibold">{questions.length} questions loaded</p>
          </div>

          <WaitingRoom
            players={players}
            gameCode={game.code}
            isHost
            onStart={handleStartGame}
          />

          <button
            onClick={handleNuke}
            className="mt-4 text-xs text-foreground/20 hover:text-danger"
          >
            Delete game & start over
          </button>
        </div>
      )}

      {/* ACTIVE: Showing question, waiting for answers */}
      {game.status === 'active' && currentQuestion && (
        <div className="flex w-full max-w-lg flex-col items-center gap-6">
          <div className="w-full text-center">
            <p className="text-sm uppercase tracking-widest text-accent">
              Question {game.current_question + 1} of {questions.length}
            </p>
            <h2 className="mt-4 text-2xl font-bold">{currentQuestion.text}</h2>
            {currentQuestion.correct_answer && (
              <p className="mt-2 text-sm text-accent/60">
                Expected: {currentQuestion.correct_answer}
              </p>
            )}
          </div>

          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-foreground/40">
                Answers received: {answers.length} / {players.length}
              </p>
              <button
                onClick={() => currentQuestion && getAnswersForQuestion(currentQuestion.id).then(setAnswers)}
                className="text-xs text-accent hover:text-accent-dark"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {answers.map((a) => (
                <div key={a.id} className="rounded-lg border border-card-border bg-card px-4 py-2">
                  <span className="text-sm text-foreground/40">{a.player.name}:</span>{' '}
                  <span>{a.answer_text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleMoveToGrading}
            className="w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark"
          >
            Close Answers & Grade
          </button>
          <button
            onClick={handleRedoQuestion}
            className="w-full rounded-full border border-card-border py-2 text-sm text-foreground/40 transition-colors hover:text-foreground/60"
          >
            Redo This Question
          </button>
        </div>
      )}

      {/* GRADING: Host grades each answer */}
      {game.status === 'grading' && currentQuestion && (
        <div className="w-full max-w-lg">
          <GradingPanel
            answers={answers}
            correctAnswer={currentQuestion.correct_answer}
            onGrade={handleGrade}
            onFinishGrading={handleFinishGrading}
            questionText={currentQuestion.text}
          />
          <button
            onClick={handleRedoQuestion}
            className="mt-3 w-full rounded-full border border-card-border py-2 text-sm text-foreground/40 transition-colors hover:text-foreground/60"
          >
            Redo This Question
          </button>
        </div>
      )}

      {/* REVEALING: Show leaderboard after grading */}
      {game.status === 'revealing' && (
        <div className="w-full max-w-lg">
          <Leaderboard
            players={players}
            title={`After Question ${game.current_question + 1}`}
            showContinue
            onContinue={handleNextQuestion}
          />
          <button
            onClick={handleRedoQuestion}
            className="mt-3 w-full rounded-full border border-card-border py-2 text-sm text-foreground/40 transition-colors hover:text-foreground/60"
          >
            Redo This Question
          </button>
        </div>
      )}

      {/* FINISHED: Final results */}
      {game.status === 'finished' && (
        <FinalResults players={players} isHost onReset={handleReset} />
      )}
    </div>
  );
}
