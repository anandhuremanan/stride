"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AgentAdapter } from "../core/agent/adapter";

/*
 * Where an application plugs its own language model in.
 *
 * Nothing below this provider knows which one it is. A component asks the
 * context for an adapter; if there is none, the component renders exactly as
 * it does today and its natural-language affordance is simply absent. That is
 * the whole opt-in: no provider, no AI, no bytes, no network.
 */

interface AIContextValue {
  adapter: AgentAdapter | null;
  /** Shown above the input, e.g. "Ask about these customers". */
  placeholder?: string;
  /** Example utterances offered as one-click suggestions. */
  suggestions?: readonly string[];
}

const AIContext = createContext<AIContextValue>({ adapter: null });

export interface GramproAIProviderProps extends AIContextValue {
  children: ReactNode;
}

export function GramproAIProvider({
  adapter,
  placeholder,
  suggestions,
  children,
}: GramproAIProviderProps) {
  const value = useMemo(
    () => ({ adapter, placeholder, suggestions }),
    [adapter, placeholder, suggestions],
  );
  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * The adapter in scope, or null.
 *
 * Null is an ordinary case, not an error: a component asks, gets nothing, and
 * renders without the affordance.
 */
export function useAgentAdapter(): AIContextValue {
  return useContext(AIContext);
}
