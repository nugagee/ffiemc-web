/** Toggles / title on the left, primary CTA flush right on the same row. */
export function PageToolbar({ left, right, className = "mt-4 sm:mt-5", align = "center" }) {
  const alignClass = align === "start" ? "items-start" : "items-center";
  return (
    <div className={`${className} flex flex-col gap-3 sm:flex-row sm:flex-wrap ${alignClass}`}>
      <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">{left}</div>
      {right ? <div className="w-full sm:w-auto sm:ml-auto shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{right}</div> : null}
    </div>
  );
}
