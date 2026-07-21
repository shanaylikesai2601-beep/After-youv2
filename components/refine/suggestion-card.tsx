"use client";

import type { RefineSuggestion } from "@/server/ai/agents/refiner";

interface SuggestionCardProps {
  suggestion: RefineSuggestion;
  index: number;
  selected: boolean;
  onSelect: () => void;
  delay: number;
}

export function SuggestionCard({ suggestion, index, selected, onSelect, delay }: SuggestionCardProps) {
  const isCustom = index === 3;

  return (
    <button
      className={`refine-card${selected ? " refine-card-selected" : ""}`}
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      type="button"
    >
      {!isCustom && (
        <span className={`refine-impact refine-impact-${suggestion.impact}`}>
          {suggestion.impact}
        </span>
      )}
      <h3 className="refine-card-title">
        {isCustom ? "My own next step" : suggestion.title}
      </h3>
      {!isCustom && (
        <p className="refine-card-desc">{suggestion.description}</p>
      )}
      {isCustom && (
        <p className="refine-card-desc">Something else... Specify your own direction.</p>
      )}
    </button>
  );
}
