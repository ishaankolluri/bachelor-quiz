export type GameStatus = 'lobby' | 'active' | 'grading' | 'revealing' | 'finished';

export interface Game {
  id: string;
  code: string;
  host_pin: string;
  status: GameStatus;
  current_question: number;
  created_at: string;
}

export interface Question {
  id: string;
  game_id: string;
  text: string;
  correct_answer: string | null;
  order_num: number;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  score: number;
  joined_at: string;
}

export interface Answer {
  id: string;
  player_id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean | null;
  submitted_at: string;
}
