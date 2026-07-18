"use client";

import { useState, type ReactNode } from "react";

export function TeamTabs({
  header,
  tabs,
}: {
  header: ReactNode;
  tabs: Array<{ label: string; content: ReactNode }>;
}) {
  const [active, setActive] = useState(0);
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-white/8">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#1a1a1a",
            backgroundImage:
              "radial-gradient(120% 150% at 100% 45%, rgba(0,68,255,.55), transparent 46%), radial-gradient(95% 130% at 6% -15%, rgba(151,224,95,.42), transparent 42%), radial-gradient(75% 110% at 20% -35%, rgba(250,61,61,.5), transparent 44%)",
          }}
        />
        <div className="relative px-5 pt-6 sm:px-8">
          {header}
          <div className="mt-6 flex gap-6 overflow-x-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                onClick={() => setActive(index)}
                className={`relative shrink-0 pb-3 text-sm font-bold transition ${
                  active === index ? "text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                {tab.label}
                {active === index && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#00c281]" />}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="mt-5">{tabs[active]?.content}</div>
    </>
  );
}
