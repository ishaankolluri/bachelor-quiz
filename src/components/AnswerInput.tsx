'use client';

import { useState } from 'react';

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  submitted?: boolean;
  currentAnswer?: string;
}

export default function AnswerInput({ onSubmit, disabled, submitted, currentAnswer }: AnswerInputProps) {
  const [answer, setAnswer] = useState(currentAnswer || '');
  const [editing, setEditing] = useState(!submitted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
      setEditing(false);
    }
  };

  if (submitted && !editing) {
    return (
      <div className="w-full max-w-lg text-center">
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-6 py-4">
          <p className="text-lg font-medium text-accent">Answer submitted!</p>
          <p className="mt-1 text-foreground/80">&ldquo;{currentAnswer}&rdquo;</p>
          {!disabled && (
            <button
              onClick={() => { setAnswer(currentAnswer || ''); setEditing(true); }}
              className="mt-3 text-sm text-accent/60 underline hover:text-accent"
            >
              Edit answer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        autoFocus
        className="w-full rounded-lg border border-card-border bg-card px-4 py-3 text-lg text-foreground placeholder-foreground/30 outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={disabled || !answer.trim()}
        className="mt-3 w-full rounded-full bg-accent py-3 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
      >
        {submitted ? 'Update Answer' : 'Submit Answer'}
      </button>
    </form>
  );
}
