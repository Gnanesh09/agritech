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
      className="relative overflow-hidden py-20 sm:py-28"
    >
      {/* Background */}

      <div className="absolute inset-0 bg-gradient-to-b from-white via-green-50/40 to-white" />

      <div className="relative mx-auto max-w-4xl px-6">

        {/* Heading */}

        <motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1],
  }}
          viewport={{ once: true }}
          className="mb-12 text-center sm:mb-16"
        >
          <span className="inline-flex rounded-full bg-[#e5efd8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#236044]">

            Frequently Asked Questions

          </span>

          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">

            Still Have Questions?

          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#617369] sm:text-lg">

            We&apos;ve answered the most common questions about
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
