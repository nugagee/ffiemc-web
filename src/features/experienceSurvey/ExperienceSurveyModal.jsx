import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Sparkles, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { authApi } from "../../lib/api";
import { useSettings } from "../../context/SettingsContext";
import { sendExperienceSurveySubmissionEmail } from "../../lib/email";
import {
  SURVEY_FEATURES,
  averageComfort,
  buildSubmitterContext,
  buildSurveyFeedbackText,
  markSurveySubmitted,
} from "./surveyHelpers";

const SCORE_LABELS = ["Hard", "A bit hard", "Okay", "Good", "Great"];
const SCORE_EMOJIS = ["😟", "😕", "😐", "🙂", "😊"];
const SCORE_LABELS_SHORT = ["Hard", "Bit hard", "Okay", "Good", "Great"];
const SUCCESS_AUTO_CLOSE_MS = 4000;
const EXIT_DURATION_S = 0.38;

export function ExperienceSurveyModal({ open, path = "/", onClose }) {
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();
  const [present, setPresent] = useState(open);
  const [step, setStep] = useState("welcome");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [comfortScores, setComfortScores] = useState({});
  const [overallRating, setOverallRating] = useState(null);
  const [improvements, setImprovements] = useState("");
  const [wishedFeatures, setWishedFeatures] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const closeReasonRef = useRef("dismissed");
  const closingRef = useRef(false);

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      setPresent(true);
      setStep("welcome");
      setFeatureIndex(0);
      setComfortScores({});
      setOverallRating(null);
      setImprovements("");
      setWishedFeatures("");
      setName("");
      setEmail("");
      setSubmitting(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!present) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  const requestClose = (reason = "dismissed") => {
    if (closingRef.current) return;
    closingRef.current = true;
    closeReasonRef.current = reason;
    setPresent(false);
  };

  useEffect(() => {
    if (!present || step !== "success") return undefined;
    const timer = window.setTimeout(() => {
      requestClose("submitted");
    }, SUCCESS_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, step]);

  const currentFeature = SURVEY_FEATURES[featureIndex];
  const totalSteps = SURVEY_FEATURES.length + 5;
  const progress =
    step === "welcome"
      ? 1
      : step === "comfort"
        ? 2 + featureIndex
        : step === "overall"
          ? 2 + SURVEY_FEATURES.length
          : step === "improve"
            ? 3 + SURVEY_FEATURES.length
            : step === "wish"
              ? 4 + SURVEY_FEATURES.length
              : step === "details"
                ? 5 + SURVEY_FEATURES.length
                : totalSteps;

  const submit = async () => {
    if (!overallRating) {
      setError("Please choose an overall rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const completeComfort = SURVEY_FEATURES.reduce((acc, feature) => {
        acc[feature.key] = comfortScores[feature.key] ?? overallRating;
        return acc;
      }, {});
      const avg = averageComfort(completeComfort);
      const submitter = buildSubmitterContext({ name, email, path });
      const feedbackText = buildSurveyFeedbackText({
        comfortScores: completeComfort,
        overallRating,
        improvements,
        wishedFeatures,
      });
      const surveyId = await authApi.submitExperienceSurvey({
        visitor_key: submitter.visitor_key,
        name: submitter.name,
        email: submitter.email,
        audience: submitter.audience,
        path: submitter.path,
        overall_rating: overallRating,
        comfort_scores: completeComfort,
        average_comfort: avg,
        improvements,
        wished_features: wishedFeatures,
        feedback_text: feedbackText,
        metadata: submitter.metadata,
      });
      try {
        await sendExperienceSurveySubmissionEmail({
          surveyId,
          name: submitter.name,
          email: submitter.email,
          overallRating,
          averageComfort: avg,
          comfortScores: completeComfort,
          improvements,
          wishedFeatures,
          feedbackText,
          path: submitter.path,
          audience: submitter.audience,
          adminEmail: settings?.notificationEmail || "adenugaolajideadewale@gmail.com",
          secondaryEmails: settings?.secondaryNotificationEmails,
          emailSubjects: settings?.emailSubjects,
        });
      } catch (emailErr) {
        console.warn("Experience survey notify email failed:", emailErr?.message || emailErr);
      }
      markSurveySubmitted();
      setStep("success");
    } catch (err) {
      setError(err.message || "Could not send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const overlayTransition = reduceMotion
    ? { duration: 0.15 }
    : { duration: EXIT_DURATION_S, ease: [0.22, 1, 0.36, 1] };
  const panelTransition = reduceMotion
    ? { duration: 0.15 }
    : { duration: EXIT_DURATION_S, ease: [0.22, 1, 0.36, 1] };

  return (
    <AnimatePresence
      onExitComplete={() => {
        onClose?.(closeReasonRef.current);
      }}
    >
      {present ? (
        <motion.div
          key="experience-survey-overlay"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.96, transition: panelTransition }
            }
            transition={panelTransition}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] border border-red-100 bg-gradient-to-br from-white via-orange-50/70 to-red-50 shadow-2xl max-h-[min(100dvh,100%)] sm:max-h-[min(92dvh,40rem)] sm:rounded-[28px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ffiemc-experience-survey-title"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />

            <div className="relative shrink-0 border-b border-red-100/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-navy/15 sm:hidden" aria-hidden />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600 sm:text-[11px] sm:tracking-[0.18em]">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    Fire-Fire pulse
                  </p>
                  <h2
                    id="ffiemc-experience-survey-title"
                    className="mt-1 font-heading text-lg font-bold leading-snug text-navy sm:text-xl"
                  >
                    {step === "success" ? "Thank you for sharing" : "Help us serve you better"}
                  </h2>
                </div>
                {step !== "success" && (
                  <button
                    type="button"
                    onClick={() => requestClose("dismissed")}
                    className="shrink-0 rounded-full border border-red-100 bg-white/80 p-2 text-navy/60 transition hover:bg-white"
                    aria-label="Close survey"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {step !== "success" && (
                <div className="mt-3 sm:mt-4">
                  <div className="mb-1 flex justify-between text-[11px] font-medium text-navy/50">
                    <span>
                      Step {Math.min(progress, totalSteps)} of {totalSteps}
                    </span>
                    <span>{Math.round((progress / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-red-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500"
                      style={{ width: `${(progress / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {step === "success" && (
                <p className="mt-2 text-[11px] text-navy/45">Closing automatically in a moment…</p>
              )}
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step === "comfort" ? `comfort-${featureIndex}` : step}
                  initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === "welcome" && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="rounded-2xl border border-red-100 bg-white/80 p-3 sm:rounded-3xl sm:p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 sm:h-12 sm:w-12">
                            <HeartHandshake className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <p className="text-sm leading-relaxed text-navy/75">
                            A short, calm check-in about how comfortable the FFIEMC website feels — and what you would love us to improve next.
                          </p>
                        </div>
                      </div>
                      <ul className="grid gap-2 text-sm text-navy/70 sm:grid-cols-3">
                        <li className="rounded-2xl bg-white/80 px-3 py-2.5 sm:py-3">One question at a time</li>
                        <li className="rounded-2xl bg-white/80 px-3 py-2.5 sm:py-3">Skip whenever you need</li>
                        <li className="rounded-2xl bg-white/80 px-3 py-2.5 sm:py-3">Your voice shapes the site</li>
                      </ul>
                    </div>
                  )}

                  {step === "comfort" && currentFeature && (
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Comfort check</p>
                        <h3 className="mt-1 text-base font-bold text-navy sm:text-lg">{currentFeature.label}</h3>
                        <p className="mt-1 text-sm text-navy/60">{currentFeature.helper}</p>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {SCORE_EMOJIS.map((emoji, index) => {
                          const score = index + 1;
                          const selected = comfortScores[currentFeature.key] === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() =>
                                setComfortScores((prev) => ({ ...prev, [currentFeature.key]: score }))
                              }
                              className={`flex min-h-[3.75rem] flex-col items-center justify-center rounded-xl border px-0.5 py-1.5 text-center transition sm:min-h-[4.5rem] sm:rounded-2xl sm:px-1 sm:py-2 ${
                                selected
                                  ? "border-red-600 bg-red-600 text-white shadow-lg"
                                  : "border-red-100 bg-white/80 text-navy hover:border-red-300"
                              }`}
                              aria-pressed={selected}
                              aria-label={`${SCORE_LABELS[index]} (${score} of 5)`}
                            >
                              <span className="text-lg sm:text-xl" aria-hidden>
                                {emoji}
                              </span>
                              <span className="mt-0.5 hidden text-[10px] font-semibold leading-tight sm:mt-1 sm:block">
                                {SCORE_LABELS[index]}
                              </span>
                              <span className="mt-0.5 block text-[9px] font-semibold leading-tight sm:hidden">
                                {SCORE_LABELS_SHORT[index]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === "overall" && (
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base font-bold text-navy sm:text-lg">How would you rate your overall experience?</h3>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {SCORE_EMOJIS.map((emoji, index) => {
                          const score = index + 1;
                          const selected = overallRating === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setOverallRating(score)}
                              className={`flex min-h-[3.75rem] flex-col items-center justify-center rounded-xl border px-0.5 py-1.5 transition sm:min-h-[4.5rem] sm:rounded-2xl sm:px-1 sm:py-2 ${
                                selected
                                  ? "border-red-600 bg-red-600 text-white shadow-lg"
                                  : "border-red-100 bg-white/80 text-navy hover:border-red-300"
                              }`}
                              aria-label={`Rate ${score} of 5`}
                            >
                              <span className="text-lg sm:text-xl" aria-hidden>
                                {emoji}
                              </span>
                              <span className="mt-0.5 text-[10px] font-semibold sm:mt-1">{score}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === "improve" && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-navy sm:text-lg">What should we improve?</h3>
                      <textarea
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-red-100 bg-white/90 px-3 py-3 text-sm leading-relaxed text-navy outline-none ring-red-200 transition focus:ring-2 sm:rounded-3xl sm:px-4"
                        placeholder="Navigation, sermons, events, joining the church, mobile layout…"
                      />
                    </div>
                  )}

                  {step === "wish" && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-navy sm:text-lg">What features would you like next?</h3>
                      <textarea
                        value={wishedFeatures}
                        onChange={(e) => setWishedFeatures(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-red-100 bg-white/90 px-3 py-3 text-sm leading-relaxed text-navy outline-none ring-red-200 transition focus:ring-2 sm:rounded-3xl sm:px-4"
                        placeholder="Live updates, devotionals, youth tools, prayer follow-up…"
                      />
                    </div>
                  )}

                  {step === "details" && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-navy sm:text-lg">Optional contact details</h3>
                      <p className="text-sm text-navy/60">Leave blank to stay anonymous. We only use this to follow up if needed.</p>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Your name"
                        autoComplete="name"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Email (optional)"
                        autoComplete="email"
                        inputMode="email"
                      />
                      {error && (
                        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                      )}
                    </div>
                  )}

                  {step === "success" && (
                    <div className="flex flex-col items-center py-4 text-center sm:py-6">
                      <motion.div
                        initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xl sm:h-24 sm:w-24"
                      >
                        <Check className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={3} />
                      </motion.div>
                      <h3 className="text-lg font-bold text-navy sm:text-xl">Thank you — we heard you</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-navy/70">
                        Your feedback helps Fire-Fire International Evangelical Mission Church serve with clearer, warmer digital hospitality.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-red-100/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-5 sm:py-4">
              {step === "success" ? (
                <Button
                  type="button"
                  onClick={() => requestClose("submitted")}
                  className="ml-auto rounded-2xl bg-red-600 hover:bg-red-700"
                >
                  Done
                </Button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => requestClose("snoozed")}
                    className="rounded-2xl px-2 py-2 text-sm font-medium text-navy/55 hover:text-navy sm:px-3"
                  >
                    Maybe later
                  </button>
                  <div className="flex items-center gap-2">
                    {step !== "welcome" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl px-3 sm:px-4"
                        onClick={() => {
                          if (step === "comfort" && featureIndex > 0) {
                            setFeatureIndex((i) => i - 1);
                            return;
                          }
                          if (step === "comfort") setStep("welcome");
                          if (step === "overall") {
                            setStep("comfort");
                            setFeatureIndex(SURVEY_FEATURES.length - 1);
                          }
                          if (step === "improve") setStep("overall");
                          if (step === "wish") setStep("improve");
                          if (step === "details") setStep("wish");
                        }}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    {step === "welcome" && (
                      <Button type="button" className="rounded-2xl bg-red-600 hover:bg-red-700" onClick={() => setStep("comfort")}>
                        Start
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {step === "comfort" && (
                      <Button
                        type="button"
                        disabled={!comfortScores[currentFeature.key]}
                        className="rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40"
                        onClick={() => {
                          if (featureIndex < SURVEY_FEATURES.length - 1) setFeatureIndex((i) => i + 1);
                          else setStep("overall");
                        }}
                      >
                        Next
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {step === "overall" && (
                      <Button
                        type="button"
                        disabled={!overallRating}
                        className="rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40"
                        onClick={() => setStep("improve")}
                      >
                        Next
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {step === "improve" && (
                      <Button type="button" className="rounded-2xl bg-red-600 hover:bg-red-700" onClick={() => setStep("wish")}>
                        Next
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {step === "wish" && (
                      <Button type="button" className="rounded-2xl bg-red-600 hover:bg-red-700" onClick={() => setStep("details")}>
                        Next
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {step === "details" && (
                      <Button
                        type="button"
                        disabled={submitting}
                        className="rounded-2xl bg-red-600 hover:bg-red-700"
                        onClick={() => void submit()}
                      >
                        {submitting ? "Sending…" : "Send feedback"}
                        <Sparkles className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
