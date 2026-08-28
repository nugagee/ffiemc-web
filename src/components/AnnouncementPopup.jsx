import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const dismissKey = (id) => `ffiemc_announcement_dismissed_${id}`;

function isDismissed(item) {
  if (!item?.show_once) return false;
  try {
    const raw = localStorage.getItem(dismissKey(item.id));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Re-show if announcement was updated after dismiss
    if (item.updated_at && parsed.at && new Date(item.updated_at) > new Date(parsed.at)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function dismiss(item) {
  try {
    localStorage.setItem(
      dismissKey(item.id),
      JSON.stringify({ at: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function AnnouncementPopup() {
  const [item, setItem] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !getSupabase()) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await getSupabase().rpc("public_list_active_announcements");
        if (error) throw error;
        const list = Array.isArray(data) ? data : [];
        const next = list.find((row) => row && !isDismissed(row));
        if (!cancelled && next) {
          setItem(next);
          setOpen(true);
        }
      } catch (err) {
        console.warn("Announcements load failed:", err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (item) dismiss(item);
    setOpen(false);
  };

  if (!item) return null;

  const link = (item.link_url || "").trim();
  const isInternal = link.startsWith("/");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 sm:rounded-2xl [&>button]:right-3 [&>button]:top-3">
        {item.image ? (
          <div className="relative w-full aspect-[16/9] bg-gray-100">
            <img
              src={item.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 pr-8">
              {item.title}
            </DialogTitle>
          </DialogHeader>
          {item.body ? (
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{item.body}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {link ? (
              isInternal ? (
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <Link to={link} onClick={close}>
                    {item.link_text || "Learn more"}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <a href={link} target="_blank" rel="noreferrer" onClick={close}>
                    {item.link_text || "Learn more"}
                  </a>
                </Button>
              )
            ) : null}
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementPopup;
