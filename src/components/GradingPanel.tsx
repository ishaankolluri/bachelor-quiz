'use client';

import { Answer, Player } from '@/lib/types';

interface AnswerWithPlayer extends Answer {
  player: Player;
}

interface GradingPanelProps {
  answers: AnswerWithPlayer[];
  correctAnswer: string | null;
  onGrade: (answerId: string, isCorrect: boolean) => void;
  onFinishGrading: () => void;
  questionText: string;
}

export default function GradingPanel({
  answers,
  correctAnswer,
  onGrade,
  onFinishGrading,
  questionText,
}: GradingPanelProps) {
  const allGraded = answers.length === 0 || answers.every((a) => a.is_correct !== null);

  return (
    <div className="w-full max-w-lg">
      <h2 className="mb-1 text-xl font-bold">{questionText}</h2>
      {correctAnswer && (
        <p className="mb-4 text-sm text-accent">
          Expected: <span className="font-semibold">{correctAnswer}</span>
        </p>
      )}

      <div className="space-y-3">
        {answers.map((answer) => (
          <div
            key={answer.id}
            className={`rounded-lg border px-4 py-3 ${
              answer.is_correct === true
                ? 'border-success/50 bg-success/10'
                : answer.is_correct === false
                ? 'border-danger/50 bg-danger/10'
                : 'border-card-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/60">{answer.player.name}</p>
                <p className="text-lg">{answer.answer_text}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onGrade(answer.id, true)}
                  className={`rounded-full px-3 py-1 text-sm font-bold transition-colors ${
                    answer.is_correct === true
                      ? 'bg-success text-white'
                      : 'bg-card-border text-foreground/60 hover:bg-success/30'
                  }`}
                >
                  ✓
                </button>
                <button
                  onClick={() => onGrade(answer.id, false)}
                  className={`rounded-full px-3 py-1 text-sm font-bold transition-colors ${
                    answer.is_correct === false
                      ? 'bg-danger text-white'
                      : 'bg-card-border text-foreground/60 hover:bg-danger/30'
                  }`}
                >
                  ✗
                </button>
              </div>
            </div>
          </div>
        ))}
        {answers.length === 0 && (
          <p className="py-8 text-center text-foreground/40">No answers submitted yet...</p>
        )}
      </div>

      {allGraded && (
        <button
          onClick={onFinishGrading}
          className="mt-6 w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark"
        >
          Show Scores & Continue
        </button>
      )}
    </div>
  );
}
