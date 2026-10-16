"use client";

import { useCallback, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cx } from "../../shared/core/cx";
import { useAgentAdapter } from "../../shared/react/GramproAIProvider";
import { useAskAgent, type AskableAgent } from "../../shared/react/useAskAgent";
import type { GridAgent } from "../agent/engine";

/*
 * The box a person types into.
 *
 * It owns no grid semantics. Everything it shows — what happened, what was
 * refused and why, which question to ask back — comes from the validator, in
 * the validator's own words. That matters more than it sounds: a message this
 * component invented would be a second source of truth about what the grid
 * can do, and would drift.
 *
 * Renders nothing at all when no adapter is in scope, so a grid in an
 * application with no AI configured is the grid it has always been.
 */

export interface AskGridProps<T> {
  /**
   * The agent that turns a sentence into grid operations, from
   * `useGridAgent`. `null` while none is in scope, and the box renders
   * nothing rather than offering something that cannot answer.
   */
  agent: GridAgent<T> | null;
  placeholder?: string;
  /**
   * Example questions offered before anyone types. Worth setting to the
   * phrasings this data actually supports — they teach the shape of a good
   * question faster than placeholder text does.
   */
  suggestions?: readonly string[];
  className?: string;
  "aria-label"?: string;
}

const TONE: Record<string, string> = {
  done: "ask-ok",
  clarify: "ask-ask",
  refused: "ask-no",
  error: "ask-err",
};

export function AskGrid<T>({
  agent,
  placeholder,
  suggestions,
  className,
  "aria-label": ariaLabel,
}: AskGridProps<T>) {
  const context = useAgentAdapter();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();

  const { ask, confirm, reset, outcome, busy, pending } = useAskAgent(
    agent as AskableAgent | null,
    context.adapter,
  );

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void ask(text);
    },
    [ask, text],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && outcome.phase !== "idle") {
        event.stopPropagation();
        reset();
      }
    },
    [outcome.phase, reset],
  );

  const useSuggestion = useCallback(
    (value: string) => {
      setText(value);
      inputRef.current?.focus();
      void ask(value);
    },
    [ask],
  );

  // No adapter configured: the feature is simply not here.
  if (!context.adapter) return null;

  const hints = suggestions ?? context.suggestions ?? [];
  const showHints = hints.length > 0 && text === "" && outcome.phase === "idle";

  return (
    <div className={cx("ask-root", className)}>
      <form className="ask-form" onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          className="ask-input"
          value={text}
          disabled={!agent}
          placeholder={placeholder ?? context.placeholder ?? "Ask about this data…"}
          aria-label={ariaLabel ?? "Ask about this data"}
          aria-describedby={outcome.phase === "idle" ? undefined : statusId}
          aria-busy={busy || undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="ask-send" disabled={busy || !agent || text.trim() === ""}>
          {busy ? "…" : "Ask"}
        </button>
      </form>

      {showHints && (
        <div className="ask-hints">
          {hints.map((hint) => (
            <button
              key={hint}
              type="button"
              className="ask-hint"
              onClick={() => useSuggestion(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {outcome.phase !== "idle" && (
        /*
         * `polite`, not `assertive`: the grid itself has already changed, and
         * a screen reader interrupting to repeat it would be noise.
         */
        <div id={statusId} className={cx("ask-status", TONE[outcome.phase])} role="status" aria-live="polite">
          {outcome.phase === "thinking" ? (
            <span className="ask-thinking">Thinking…</span>
          ) : (
            <>
              <span className="ask-message">{outcome.message}</span>

              {outcome.suggestion && <span className="ask-suggestion">{outcome.suggestion}</span>}

              {outcome.layer && (
                <span className="ask-layer" title={`Refused by the ${outcome.layer} layer`}>
                  {outcome.layer}
                </span>
              )}

              {outcome.warnings?.map((warning) => (
                <span key={warning} className="ask-warning">
                  {warning}
                </span>
              ))}

              {pending !== null && (
                <button type="button" className="ask-confirm" onClick={() => void confirm()}>
                  Yes, do it
                </button>
              )}

              <button type="button" className="ask-dismiss" onClick={reset} aria-label="Dismiss">
                ×
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
