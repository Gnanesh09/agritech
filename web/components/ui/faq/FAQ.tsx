"use client";

import { useState } from "react";
import { faqData } from "./faqData";
import FAQItem from "./FAQItem";
import { motion } from "framer-motion";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative py-32 overflow-hidden"
    >
      {/* Background */}

      <div className="absolute inset-0 bg-gradient-to-b from-white via-green-50/40 to-white" />

      <div className="relative max-w-4xl mx-auto px-6">

        {/* Heading */}

        <motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1],
  }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-flex rounded-full bg-green-100 px-5 py-2 text-green-700 font-semibold">

            Frequently Asked Questions

          </span>

          <h2 className="mt-6 text-5xl font-bold text-gray-900">

            Still Have Questions?

          </h2>

          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">

            We've answered the most common questions about
            Smart Agri, IoT devices, automation, and remote
            farm management.

          </p>
        </motion.div>

        {/* FAQ */}

        <div className="space-y-6">
          {faqData.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={open === index}
              onClick={() =>
                setOpen(open === index ? null : index)
              }
            />
          ))}
        </div>

      </div>
    </section>
  );
}