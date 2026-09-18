import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePopupPriority } from "../../context/PopupPriorityContext";
import { ExperienceSurveyModal } from "./ExperienceSurveyModal";
import {
  EXPERIENCE_SURVEY_DELAY_MS,
  markSurveySnoozed,
  shouldOfferExperienceSurvey,
} from "./surveyHelpers";

/**
 * Timed homepage experience survey for public visitors.
 * Waits for month-welcome to finish, then delays before opening.
 */
export function ExperienceSurveyPrompt() {
  const location = useLocation();
  const { monthWelcomeBlocking } = usePopupPriority();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (location.pathname !== "/") return undefined;
    if (monthWelcomeBlocking) return undefined;
    if (!shouldOfferExperienceSurvey()) return undefined;

    const timer = window.setTimeout(() => {
      if (shouldOfferExperienceSurvey()) setOpen(true);
    }, EXPERIENCE_SURVEY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [location.pathname, monthWelcomeBlocking]);

  return (
    <ExperienceSurveyModal
      open={open}
      path={location.pathname}
      onClose={(reason) => {
        if (reason === "snoozed" || reason === "dismissed") markSurveySnoozed();
        setOpen(false);
      }}
    />
  );
}
