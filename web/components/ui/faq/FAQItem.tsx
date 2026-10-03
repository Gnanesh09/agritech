"use client";

import { Plus, X } from "lucide-react";

interface Props {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function FAQItem({ question, answer, isOpen, onClick }: Props) {
  return (
    <div className={`overflow-hidden rounded-[1.25rem] border transition-colors duration-200 ${isOpen ? "border-[#174b36]/25 bg-white shadow-[0_12px_30px_rgba(20,61,43,0.08)]" : "border-[#174b36]/10 bg-white/70 hover:border-[#174b36]/20"}`}>
      <button onClick={onClick} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6" aria-expanded={isOpen}>
        <h3 className="text-base font-semibold tracking-[-0.015em] text-[#173c2c] sm:text-lg">{question}</h3>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e5efd8] text-[#236044]">
          {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        </span>
      </button>
      {isOpen && <div className="px-5 pb-5 text-sm leading-7 text-[#617369] sm:px-6 sm:pb-6 sm:text-base">{answer}</div>}
    </div>
  );
}
