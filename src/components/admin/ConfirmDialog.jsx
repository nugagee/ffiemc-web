import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-50 text-emerald-600",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  danger: {
    icon: XCircle,
    iconWrap: "bg-red-50 text-red-600",
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-50 text-amber-600",
    confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  default: {
    icon: Info,
    iconWrap: "bg-gray-100 text-gray-700",
    confirmClass: "bg-gray-900 hover:bg-gray-800 text-white",
  },
};

/**
 * Presentational confirm dialog. Prefer `useConfirmDialog` for async confirm flows.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}) {
  const tone = VARIANTS[variant] || VARIANTS.default;
  const Icon = tone.icon;

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!loading) onOpenChange?.(next); }}>
      <AlertDialogContent className="sm:max-w-md gap-0 overflow-hidden p-0">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tone.iconWrap)}>
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <AlertDialogHeader className="space-y-2 text-left">
              <AlertDialogTitle className="text-lg leading-snug">{title}</AlertDialogTitle>
              {description ? (
                <AlertDialogDescription className="text-sm leading-relaxed text-gray-600">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
          </div>
        </div>
        <AlertDialogFooter className="border-t bg-gray-50/80 px-6 py-4 sm:space-x-2">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            disabled={loading}
            className={tone.confirmClass}
            onClick={(e) => {
              e.preventDefault();
              onConfirm?.();
            }}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Promise-based confirm for admin actions.
 * Usage:
 *   const { confirm, dialog } = useConfirmDialog();
 *   if (!(await confirm({ title, description, variant: "success" }))) return;
 *   return (<>…{dialog}</>);
 */
export function useConfirmDialog() {
  const [state, setState] = useState({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "default",
    loading: false,
  });
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false, loading: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title || "Are you sure?",
        description: options.description || "",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        variant: options.variant || "default",
        loading: false,
      });
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      loading={state.loading}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, dialog };
}
