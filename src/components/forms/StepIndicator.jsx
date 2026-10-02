const STEPS = [
  { id: "form", label: "Details" },
  { id: "otp", label: "Verify" },
  { id: "done", label: "Done" },
];

export function StepIndicator({ step = "form" }) {
  const current = Math.max(0, STEPS.findIndex((item) => item.id === step));
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Registration progress">
      {STEPS.map((item, index) => {
        const active = index === current;
        const complete = index < current;
        return (
          <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                active || complete ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {index + 1}
            </span>
            <span className={`truncate text-xs font-medium sm:text-sm ${active ? "text-gray-900" : "text-gray-500"}`}>
              {item.label}
            </span>
            {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-gray-200" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
