import { supabase } from './supabase';
import { Game, Question, Player, Answer, GameStatus } from './types';

// ── Games ──

export async function createGame(code: string): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert({ code: code.toUpperCase() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('code', code.toUpperCase())
    .single();
  if (error) return null;
  return data;
}

export async function getGame(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();
  if (error) return null;
  return data;
}

export async function updateGameStatus(gameId: string, status: GameStatus, currentQuestion?: number): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (currentQuestion !== undefined) update.current_question = currentQuestion;
  const { error } = await supabase.from('games').update(update).eq('id', gameId);
  if (error) throw error;
}

// ── Questions ──

export async function getQuestions(gameId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('game_id', gameId)
    .order('order_num');
  if (error) throw error;
  return data;
}

export async function addQuestion(gameId: string, text: string, correctAnswer: string, orderNum: number): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .insert({ game_id: gameId, text, correct_answer: correctAnswer, order_num: orderNum })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}

// ── Players ──

export async function joinGame(gameId: string, name: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({ game_id: gameId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPlayers(gameId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .order('score', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Answers ──

export async function submitAnswer(playerId: string, questionId: string, answerText: string): Promise<Answer> {
  // Check if player already answered this question
  const { data: existing } = await supabase
    .from('answers')
    .select()
    .eq('player_id', playerId)
    .eq('question_id', questionId)
    .single();

  if (existing) {
    // Update existing answer
    const { data, error } = await supabase
      .from('answers')
      .update({ answer_text: answerText })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('answers')
    .insert({ player_id: playerId, question_id: questionId, answer_text: answerText })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPlayerAnswer(playerId: string, questionId: string): Promise<Answer | null> {
  const { data, error } = await supabase
    .from('answers')
    .select()
    .eq('player_id', playerId)
    .eq('question_id', questionId)
    .single();
  if (error) return null;
  return data;
}

export async function getAnswersForQuestion(questionId: string): Promise<(Answer & { player: Player })[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('*, player:players(*)')
    .eq('question_id', questionId);
  if (error) throw error;
  return data as (Answer & { player: Player })[];
}

export async function gradeAnswer(answerId: string, isCorrect: boolean): Promise<void> {
  const { error } = await supabase
    .from('answers')
    .update({ is_correct: isCorrect })
    .eq('id', answerId);
  if (error) throw error;
}

export async function updatePlayerScore(playerId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update({ score })
    .eq('id', playerId);
  if (error) throw error;
}

// ── Redo Question ──

export async function redoQuestion(questionId: string, gameId: string, questionIndex: number): Promise<void> {
  // Get answers that were marked correct so we can revert scores
  const { data: correctAnswers } = await supabase
    .from('answers')
    .select('player_id')
    .eq('question_id', questionId)
    .eq('is_correct', true);

  // Revert scores for players who got points from this question
  if (correctAnswers && correctAnswers.length > 0) {
    for (const a of correctAnswers) {
      const { data: player } = await supabase
        .from('players')
        .select('score')
        .eq('id', a.player_id)
        .single();
      if (player) {
        await supabase
          .from('players')
          .update({ score: Math.max(0, player.score - 1) })
          .eq('id', a.player_id);
      }
    }
  }

  // Delete all answers for this question
  await supabase.from('answers').delete().eq('question_id', questionId);

  // Set game back to active on this question
  await supabase
    .from('games')
    .update({ status: 'active', current_question: questionIndex })
    .eq('id', gameId);
}

// ── Reset ──

export async function resetGame(gameId: string): Promise<void> {
  // Delete all answers for this game's players
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', gameId);

  if (players && players.length > 0) {
    const playerIds = players.map(p => p.id);
    await supabase.from('answers').delete().in('player_id', playerIds);
  }

  // Delete all players and questions
  await supabase.from('players').delete().eq('game_id', gameId);
  await supabase.from('questions').delete().eq('game_id', gameId);

  await supabase.from('games').update({ status: 'lobby', current_question: 0 }).eq('id', gameId);
}
