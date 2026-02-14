'use client';

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
}

export default function QuestionCard({ questionNumber, totalQuestions, questionText }: QuestionCardProps) {
  return (
    <div className="w-full max-w-lg text-center">
      <p className="text-sm uppercase tracking-widest text-accent">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 className="mt-4 text-2xl font-bold leading-relaxed">
        {questionText}
      </h2>
    </div>
  );
}
