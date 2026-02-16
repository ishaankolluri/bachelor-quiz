'use server';

import { createGame, addQuestion } from '@/lib/queries';
import { SEED_QUESTIONS } from '@/lib/questions';

export async function createHostGame(masterPin: string): Promise<{ error: string } | { gameId: string }> {
  if (masterPin !== process.env.MASTER_PIN) {
    return { error: 'Invalid PIN.' };
  }

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  const game = await createGame(code, masterPin);

  for (let i = 0; i < SEED_QUESTIONS.length; i++) {
    await addQuestion(game.id, SEED_QUESTIONS[i].text, SEED_QUESTIONS[i].answer, i);
  }

  return { gameId: game.id };
}
