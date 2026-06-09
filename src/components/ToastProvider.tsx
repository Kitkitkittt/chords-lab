import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import type { ToastMessage } from "../types/course";
import { isKnownSkill } from "../lib/learningPath";
import { skillsById } from "../lib/skills";

function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toastFromReviewEvent(detail: unknown): Omit<ToastMessage, "id"> {
  const event = detail as
    | {
        isCorrect?: boolean;
        cleared?: boolean;
        consecutiveCorrect?: number;
      }
    | undefined;

  if (event?.cleared) {
    return {
      tone: "success",
      title: "Review prompt cleared",
      body: "Two correct answers in a row removed it from the queue."
    };
  }

  if (event?.isCorrect) {
    return {
      tone: "success",
      title: "Correct",
      body:
        event.consecutiveCorrect === 1
          ? "One more correct answer clears this missed prompt."
          : "Progress saved locally."
    };
  }

  return {
    tone: "warning",
    title: "Added to review",
    body: "This prompt will stay queued until two correct answers in a row."
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = createToastId();
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    function handleOffline() {
      pushToast({
        tone: "warning",
        title: "Offline mode",
        body: "The app shell is available and progress stays local."
      });
    }

    function handleOnline() {
      pushToast({
        tone: "info",
        title: "Back online",
        body: "Progress is still stored on this device."
      });
    }

    function handleProgressSaved() {
      pushToast({
        tone: "success",
        title: "Progress saved",
        body: "Stored under chordslab.progress.v1."
      });
    }

    function handleAudioState(event: Event) {
      const state = (event as CustomEvent<string>).detail;

      if (state === "disabled") {
        pushToast({
          tone: "info",
          title: "Audio disabled",
          body: "Turn audio back on from Progress when you want sound."
        });
      }

      if (state === "error") {
        pushToast({
          tone: "error",
          title: "Audio unavailable",
          body: "Click a play button again to let the browser unlock sound."
        });
      }
    }

    function handleReviewQueue(event: Event) {
      pushToast(toastFromReviewEvent((event as CustomEvent).detail));
    }

    function handleSkillLevelUp(event: Event) {
      const detail = (event as CustomEvent).detail as
        | { skillId?: string; level?: string }
        | undefined;
      const title =
        detail?.skillId && isKnownSkill(detail.skillId)
          ? skillsById.get(detail.skillId)?.title ?? detail.skillId
          : detail?.skillId ?? "A skill";

      pushToast({
        tone: "success",
        title: `${title} reached ${detail?.level ?? "a new level"}`,
        body: "Nice progress. Keep going at your own pace."
      });
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("chordslab:progress-saved", handleProgressSaved);
    window.addEventListener("chordslab:audio-state", handleAudioState);
    window.addEventListener("chordslab:review-queue", handleReviewQueue);
    window.addEventListener("chordslab:skill-levelup", handleSkillLevelUp);

    if (navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("chordslab:progress-saved", handleProgressSaved);
      window.removeEventListener("chordslab:audio-state", handleAudioState);
      window.removeEventListener("chordslab:review-queue", handleReviewQueue);
      window.removeEventListener("chordslab:skill-levelup", handleSkillLevelUp);
    };
  }, [pushToast]);

  return (
    <>
      {children}
      <div
        className="toast-region"
        role="log"
        aria-live="polite"
        aria-label="App updates"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.tone === "success"
              ? CheckCircle2
              : toast.tone === "warning"
                ? TriangleAlert
                : toast.tone === "error"
                  ? XCircle
                  : Info;

          return (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <Icon size={18} aria-hidden="true" />
              <div>
                <strong>{toast.title}</strong>
                {toast.body ? <span>{toast.body}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
