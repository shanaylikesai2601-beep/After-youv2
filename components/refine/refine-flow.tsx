"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { missionsApi } from "@/api/missions";
import { sessionsApi } from "@/api/sessions";
import { NovaCenter } from "./nova-center";
import { SuggestionCard } from "./suggestion-card";
import { NovaBackground } from "@/components/nova-background";
import type { RefineSuggestion } from "@/server/ai/agents/refiner";

interface RefineFlowProps {
  missionId: string;
}

type Phase = "enter" | "loading" | "suggesting" | "choosing" | "transition" | "complete";

export function RefineFlow({ missionId }: RefineFlowProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("enter");
  const [round, setRound] = useState(1);
  const [suggestions, setSuggestions] = useState<RefineSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [goal, setGoal] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const [lastChoice, setLastChoice] = useState("");
  const selectionsRef = useRef<string[]>([]);
  const refinementGoalsRef = useRef<string[]>([]);

  useEffect(() => {
    missionsApi.get(missionId).then((m) => {
      setGoal(m.goal);
      setWorkspacePath(m.workspace?.workspacePath ?? "");
    }).catch(() => {
      setGoal("");
    });
  }, [missionId]);

  useEffect(() => {
    if (!goal) return;
    const timer = window.setTimeout(() => {
      startRound(1);
    }, 1200);
    return () => clearTimeout(timer);
  }, [goal]);

  async function startRound(rnd: number) {
    setPhase("suggesting");
    setSelectedIndex(null);
    setShowCustomInput(false);
    setCustomText("");
    setShowCards(false);
    setLastChoice("");
    try {
      const result = await missionsApi.refine({
        goal,
        round: rnd,
        missionId,
        previousSelections: selectionsRef.current,
        workspacePath,
      });
      setSuggestions(result.suggestions);
      setTimeout(() => {
        setShowCards(true);
        setPhase("choosing");
      }, 400);
    } catch {
      setPhase("choosing");
    }
  }

  async function handleSelect(index: number) {
    if (phase !== "choosing") return;
    setSelectedIndex(index);

    if (index === 3) {
      setShowCustomInput(true);
      return;
    }

    const choice = suggestions[index]?.title ?? "";
    setLastChoice(choice);
    setPhase("transition");

    setTimeout(async () => {
      const next = [...selectionsRef.current, choice];
      selectionsRef.current = next;
      refinementGoalsRef.current = [...refinementGoalsRef.current, choice];

      if (round >= 3) {
        setPhase("complete");
        await finishSession();
      } else {
        setTimeout(() => {
          const nextRound = round + 1;
          setRound(nextRound);
          setTimeout(() => startRound(nextRound), 300);
        }, 1200);
      }
    }, 600);
  }

  async function handleCustomSubmit() {
    if (!customText.trim() || phase !== "choosing") return;
    const choice = customText.trim();
    setLastChoice(choice);
    setPhase("transition");

    setTimeout(async () => {
      const next = [...selectionsRef.current, choice];
      selectionsRef.current = next;
      refinementGoalsRef.current = [...refinementGoalsRef.current, choice];

      if (round >= 3) {
        setPhase("complete");
        await finishSession();
      } else {
        setTimeout(() => {
          const nextRound = round + 1;
          setRound(nextRound);
          setTimeout(() => startRound(nextRound), 300);
        }, 1200);
      }
    }, 400);
  }

  async function finishSession(): Promise<void> {
    try {
      // Create an empty session first
      const session = await sessionsApi.create({
        name: goal.slice(0, 80),
        budgetMs: 3_600_000,
      });

      // Queue the original goal as a fresh preview-only mission
      // (avoids conflict with the already-auto-started mission from create)
      await sessionsApi.queueMission(session.id, goal, goal.slice(0, 80));

      // Queue refinement missions
      for (const refGoal of refinementGoalsRef.current) {
        await sessionsApi.queueMission(session.id, refGoal, refGoal.slice(0, 120));
      }

      setTimeout(() => {
        router.push(`/sessions/${session.id}`);
      }, 1200);
    } catch {
      router.push("/sessions");
    }
  }

  return (
    <div className={`refine-screen phase-${phase}`}>
      <NovaBackground />
      <NovaCenter pulse={phase === "suggesting"} />

      <div className="refine-content">
        <div className={`refine-title-group${phase === "enter" || (phase === "transition" && round === 1) ? " refine-title-enter" : " refine-title-done"}`}>
          <span className="refine-round-label">
            {phase === "enter" ? "REFINING MISSION" : `STEP ${round} OF 3`}
          </span>
          <h1 className="refine-title">What Next?</h1>
        </div>

        {phase === "suggesting" && (
          <p className="refine-thinking">Nova is considering directions...</p>
        )}

        {phase === "transition" && lastChoice && (
          <div className="refine-chosen" key={round}>
            <span className="refine-chosen-label">Step {round} complete</span>
            <p className="refine-chosen-text">{lastChoice}</p>
          </div>
        )}

        {phase === "complete" && (
          <div className="refine-chosen">
            <span className="refine-chosen-label">All steps complete</span>
            <p className="refine-chosen-text">Preparing autonomous session...</p>
          </div>
        )}

        {showCards && suggestions.length > 0 && (
          <div className="refine-cards">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={`${round}-${i}`}
                suggestion={s}
                index={i}
                selected={selectedIndex === i}
                onSelect={() => handleSelect(i)}
                delay={i * 120}
              />
            ))}
            <SuggestionCard
              suggestion={{ title: "", description: "", impact: "medium", category: "feature" }}
              index={3}
              selected={selectedIndex === 3}
              onSelect={() => handleSelect(3)}
              delay={suggestions.length * 120}
            />
          </div>
        )}

        {showCustomInput && (
          <div className="refine-custom">
            <textarea
              className="refine-custom-input"
              placeholder="Describe your own direction..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              autoFocus
              rows={3}
            />
            <button
              className="button primary"
              onClick={handleCustomSubmit}
              disabled={!customText.trim()}
              type="button"
            >
              {round >= 3 ? "Complete →" : "Continue →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
