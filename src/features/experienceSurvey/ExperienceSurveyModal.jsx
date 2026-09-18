import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Sparkles, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { authApi } from "../../lib/api";
import {
  SURVEY_FEATURES,
  averageComfort,
  buildSubmitterContext,
  buildSurveyFeedbackText,
  markSurveySubmitted,
} from "./surveyHelpers";

const SCORE_LABELS = ["Hard", "A bit hard", "Okay", "Good", "Great"];
const SCORE_EMOJIS = ["😟", "😕", "😐", "🙂", "😊"];

export function ExperienceSurveyModal({ open, path = "/", onClose }) {
  const reduceMotion = useReducedMotion();
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

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open) return null;

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
      await authApi.submitExperienceSurvey({
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
        feedback_text: buildSurveyFeedbackText({
          comfortScores: completeComfort,
          overallRating,
          improvements,
          wishedFeatures,
        }),
        metadata: submitter.metadata,
      });
      markSurveySubmitted();
      setStep("success");
    } catch (err) {
      setError(err.message || "Could not send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/50 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-red-100 bg-gradient-to-br from-white via-orange-50/70 to-red-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ffiemc-experience-survey-title"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative border-b border-red-100/80 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                <Sparkles className="h-3.5 w-3.5" />
                Fire-Fire pulse
              </p>
              <h2 id="ffiemc-experience-survey-title" className="mt-1 font-heading text-xl font-bold text-navy">
                {step === "success" ? "Thank you for sharing" : "Help us serve you better"}
              </h2>
            </div>
            {step !== "success" && (
              <button
                type="button"
                onClick={() => onClose("dismissed")}
                className="rounded-full border border-red-100 bg-white/80 p-2 text-navy/60 transition hover:bg-white"
                aria-label="Close survey"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {step !== "success" && (
            <div className="mt-4">
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
        </div>

        <div className="relative px-5 py-5 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step === "comfort" ? `comfort-${featureIndex}` : step}
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
            >
              {step === "welcome" && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-red-100 bg-white/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <HeartHandshake className="h-6 w-6" />
                      </div>
                      <p className="text-sm leading-relaxed text-navy/75">
                        A short, calm check-in about how comfortable the FFIEMC website feels — and what you would love us to improve next.
                      </p>
                    </div>
                  </div>
                  <ul className="grid gap-2 text-sm text-navy/70 sm:grid-cols-3">
                    <li className="rounded-2xl bg-white/80 px-3 py-3">One question at a time</li>
                    <li className="rounded-2xl bg-white/80 px-3 py-3">Skip whenever you need</li>
                    <li className="rounded-2xl bg-white/80 px-3 py-3">Your voice shapes the site</li>
                  </ul>
                </div>
              )}

              {step === "comfort" && currentFeature && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Comfort check</p>
                    <h3 className="mt-1 text-lg font-bold text-navy">{currentFeature.label}</h3>
                    <p className="mt-1 text-sm text-navy/60">{currentFeature.helper}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
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
                          className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 text-center transition ${
                            selected
                              ? "border-red-600 bg-red-600 text-white shadow-lg"
                              : "border-red-100 bg-white/80 text-navy hover:border-red-300"
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="text-xl" aria-hidden>
                            {emoji}
                          </span>
                          <span className="mt-1 text-[10px] font-semibold leading-tight">{SCORE_LABELS[index]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === "overall" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-navy">How would you rate your overall experience?</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {SCORE_EMOJIS.map((emoji, index) => {
                      const score = index + 1;
                      const selected = overallRating === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setOverallRating(score)}
                          className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 transition ${
                            selected
                              ? "border-red-600 bg-red-600 text-white shadow-lg"
                              : "border-red-100 bg-white/80 text-navy hover:border-red-300"
                          }`}
                        >
                          <span className="text-xl" aria-hidden>
                            {emoji}
                          </span>
                          <span className="mt-1 text-[10px] font-semibold">{score}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === "improve" && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-navy">What should we improve?</h3>
                  <textarea
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    rows={5}
                    className="w-full rounded-3xl border border-red-100 bg-white/90 px-4 py-3 text-sm leading-relaxed text-navy outline-none ring-red-200 transition focus:ring-2"
                    placeholder="Navigation, sermons, events, joining the church, mobile layout…"
                  />
                </div>
              )}

              {step === "wish" && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-navy">What features would you like next?</h3>
                  <textarea
                    value={wishedFeatures}
                    onChange={(e) => setWishedFeatures(e.target.value)}
                    rows={5}
                    className="w-full rounded-3xl border border-red-100 bg-white/90 px-4 py-3 text-sm leading-relaxed text-navy outline-none ring-red-200 transition focus:ring-2"
                    placeholder="Live updates, devotionals, youth tools, prayer follow-up…"
                  />
                </div>
              )}

              {step === "details" && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-navy">Optional contact details</h3>
                  <p className="text-sm text-navy/60">Leave blank to stay anonymous. We only use this to follow up if needed.</p>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="Your name"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="Email (optional)"
                  />
                  {error && (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                  )}
                </div>
              )}

              {step === "success" && (
                <div className="flex flex-col items-center py-6 text-center">
                  <motion.div
                    initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xl"
                  >
                    <Check className="h-10 w-10" strokeWidth={3} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-navy">Thank you — we heard you</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-navy/70">
                    Your feedback helps Fire-Fire International Evangelical Mission Church serve with clearer, warmer digital hospitality.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-red-100/80 px-5 py-4">
          {step === "success" ? (
            <Button type="button" onClick={() => onClose("submitted")} className="ml-auto rounded-2xl bg-red-600 hover:bg-red-700">
              Done
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onClose("snoozed")}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-navy/55 hover:text-navy"
              >
                Maybe later
              </button>
              <div className="flex items-center gap-2">
                {step !== "welcome" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
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
    </div>
  );
}
