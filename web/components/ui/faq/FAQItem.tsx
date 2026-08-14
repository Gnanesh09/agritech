"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface Props {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: Props) {
  return (
    <motion.div
      layout
      className={`rounded-2xl border transition-all duration-300 overflow-hidden
      ${
        isOpen
          ? "border-green-500 shadow-xl shadow-green-200/40 bg-white"
          : "border-gray-200 bg-white hover:border-green-300"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {question}
        </h3>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <X className="text-green-600" />
          ) : (
            <Plus className="text-gray-500" />
          )}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            transition={{
              duration: 0.35,
            }}
          >
            <div className="px-6 pb-6 text-gray-600 leading-7">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}