/** Toggles / title on the left, primary CTA flush right on the same row. */
export function PageToolbar({ left, right, className = "mt-6", align = "center" }) {
  const alignClass = align === "start" ? "items-start" : "items-center";
  return (
    <div className={`${className} flex flex-wrap ${alignClass} gap-3`}>
      <div className="flex flex-wrap items-center gap-2 min-w-0">{left}</div>
      {right ? <div className="ml-auto shrink-0">{right}</div> : null}
    </div>
  );
}
