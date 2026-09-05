import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { blogPostShareSummary, blogPostShareUrl } from "../../lib/blogAnalytics";
import { trackBlogEvent } from "../../lib/blogTrack";

function facebookShareUrl(url, title, summary) {
  // `u` is required for the link attachment. `quote` pre-fills suggested text when Facebook allows it.
  const quote = [title, summary].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({ u: url });
  if (quote) params.set("quote", quote);
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

const CHANNELS = [
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    href: (url, title, summary) => facebookShareUrl(url, title, summary),
  },
  {
    id: "x",
    label: "X",
    icon: null,
    mark: "𝕏",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    href: (url, title, summary) => {
      const text = [title, summary, url].filter(Boolean).join("\n\n");
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: Send,
    href: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    href: (url, title, summary) => {
      const body = [title, summary, url].filter(Boolean).join("\n\n");
      return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    },
  },
];

export function BlogShareBar({ post }) {
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const url = blogPostShareUrl(post);
  const title = post?.title || "Read this article";
  const summary = blogPostShareSummary(post);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const recordShare = (channel) => {
    trackBlogEvent(post, "share", { shareChannel: channel }).catch(() => {});
  };

  const openShare = (channel) => {
    if (!url) {
      toast.error("Share link is not ready yet");
      return;
    }
    const link = channel.href(url, title, summary);
    recordShare(channel.id);
    if (channel.id === "email") {
      window.location.href = link;
      return;
    }
    // Centered popup keeps the article tab in place.
    const width = 640;
    const height = 720;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "scrollbars=yes",
      "resizable=yes",
      "toolbar=no",
      "menubar=no",
      "location=yes",
      "status=no",
    ].join(",");
    const popup = window.open(link, "ffiemc_share", features);
    if (!popup) {
      toast.error("Please allow popups to share, or use Copy link");
    } else {
      try {
        popup.focus();
      } catch {
        /* ignore */
      }
    }
  };

  const copyLink = async () => {
    try {
      const payload = [title, summary, url].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      recordShare("copy");
      toast.success("Article link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({
        title,
        text: summary || title,
        url,
      });
      recordShare("native");
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Share cancelled or unavailable");
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-200" data-testid="blog-share">
      <p className="text-sm font-semibold text-gray-800 mb-1">Share this article</p>
      <p className="text-sm text-gray-500 mb-4">Pass it on to someone who needs encouragement.</p>
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => openShare(channel)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 hover:border-red-200 hover:bg-red-50/50 transition-colors"
              aria-label={`Share on ${channel.label}`}
            >
              {Icon ? <Icon className="h-4 w-4" /> : <span className="text-sm font-semibold">{channel.mark}</span>}
              <span className="font-medium">{channel.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 hover:border-red-200 hover:bg-red-50/50 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          <span className="font-medium">{copied ? "Copied" : "Copy link"}</span>
        </button>
        {canNative && (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-sm text-red-800 hover:bg-red-100 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span className="font-medium">Share</span>
          </button>
        )}
      </div>
    </div>
  );
}
