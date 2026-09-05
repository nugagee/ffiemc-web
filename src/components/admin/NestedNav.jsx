import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Church,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  Globe,
  HandHeart,
  Inbox,
  Layers,
  LayoutDashboard,
  List,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Plus,
  ScrollText,
  Shield,
  Sun,
  UserPlus,
  Users,
  Video,
  Send,
  Wrench,
  Mic,
  StickyNote,
  Languages,
  Type,
} from "lucide-react";
import { pathMatches } from "../../data/adminNav";

const ICONS = {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Church,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  Globe,
  HandHeart,
  Inbox,
  Layers,
  LayoutDashboard,
  List,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Plus,
  ScrollText,
  Shield,
  UserPlus,
  Users,
  Video,
  Send,
  Wrench,
  Mic,
  StickyNote,
  Sun,
  Languages,
  Type,
};

function Icon({ name, size = 16 }) {
  const Cmp = ICONS[name] || FileText;
  return <Cmp size={size} />;
}

export function canSeeNavNode(node, { can, isSuperadmin, isPastor }) {
  if (!node) return false;
  if (isPastor) {
    if (node.hideForPastor) return false;
    if (node.pastor) return true;
    if (node.feature === "prayer.inbox" || node.to === "/admin/prayer") return true;
    if (node.children?.length) {
      return node.children.some((child) => canSeeNavNode(child, { can, isSuperadmin, isPastor }));
    }
    return false;
  }
  if (node.superadmin) return isSuperadmin;
  if (node.allAdmins) return true;
  if (node.anyOf?.length) {
    return node.anyOf.some((rule) => can(rule.feature, rule.action || "view"));
  }
  if (node.feature) return can(node.feature, node.action || "view");
  if (node.children?.length) {
    return node.children.some((child) => canSeeNavNode(child, { can, isSuperadmin, isPastor }));
  }
  return true;
}

function filterTree(nodes, ctx) {
  return (nodes || [])
    .map((node) => {
      if (!canSeeNavNode(node, ctx)) return null;
      if (node.children?.length) {
        const children = filterTree(node.children, ctx);
        if (!children.length && !node.to) return null;
        return { ...node, children };
      }
      return node;
    })
    .filter(Boolean);
}

function isGroupActive(node, pathname) {
  if (node.matchPrefix && pathMatches(pathname, node.matchPrefix)) return true;
  if (node.to) {
    if (node.end) return pathname === node.to;
    return pathname === node.to || pathname.startsWith(`${node.to}/`);
  }
  return (node.children || []).some((child) => isGroupActive(child, pathname));
}

function nodeBadge(node, badges = {}) {
  if (node.badgeKey && Number(badges[node.badgeKey]) > 0) return Number(badges[node.badgeKey]);
  if (node.children?.length) {
    return node.children.reduce((sum, child) => sum + nodeBadge(child, badges), 0);
  }
  return 0;
}

function BadgePill({ count }) {
  if (!Number(count)) return null;
  return (
    <span className="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LeafLink({ node, depth, badges = {}, onNavigate }) {
  const location = useLocation();
  const pad = depth === 0 ? "px-4 py-2.5 text-sm gap-3" : "px-3 py-2 text-[13px] gap-2";
  const iconSize = depth === 0 ? 16 : 14;
  const isEditRoute = /\/admin\/blog\/[^/]+\/edit$/.test(location.pathname);
  const blogAllActive = node.to === "/admin/blog" && (location.pathname === "/admin/blog" || isEditRoute);
  const badge = node.badgeKey ? badges[node.badgeKey] : null;

  return (
    <NavLink
      to={node.to}
      end={node.end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) => {
        const active = node.to === "/admin/blog" ? blogAllActive : isActive;
        return `flex items-center ${pad} rounded-xl transition-all duration-200 ${
          active ? "bg-red-600 text-white shadow-sm" : depth === 0 ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
        }`;
      }}
    >
      <Icon name={node.icon} size={iconSize} />
      <span className="flex-1 text-left">{node.label}</span>
      <BadgePill count={badge} />
    </NavLink>
  );
}

function Group({ node, depth, ctx, badges, onNavigate }) {
  const location = useLocation();
  const active = isGroupActive(node, location.pathname);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const pad = depth === 0 ? "px-4 py-2.5 text-sm gap-3 rounded-xl" : "px-3 py-2 text-[13px] gap-2 rounded-lg";
  const iconSize = depth === 0 ? 16 : 14;

  const groupCount = nodeBadge(node, badges);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center ${pad} transition-all duration-200 ${
          active ? "bg-white/10 text-white" : depth === 0 ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon name={node.icon} size={iconSize} />
        <span className="flex-1 text-left">{node.label}</span>
        <BadgePill count={groupCount} />
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className={`mt-1 space-y-1 border-l border-white/10 ${depth === 0 ? "ml-4 pl-2" : "ml-3 pl-2"}`}>
              {(node.children || []).map((child) =>
                child.children?.length ? (
                  <Group key={child.id} node={child} depth={depth + 1} ctx={ctx} badges={badges} onNavigate={onNavigate} />
                ) : (
                  <LeafLink key={child.id} node={child} depth={depth + 1} badges={badges} onNavigate={onNavigate} />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NestedNav({ items, can, isSuperadmin, isPastor, badges = {}, onNavigate }) {
  const ctx = { can, isSuperadmin, isPastor };
  const visible = filterTree(items, ctx);
  return (
    <div className="space-y-1">
      {visible.map((node) =>
        node.children?.length ? (
          <Group key={node.id} node={node} depth={0} ctx={ctx} badges={badges} onNavigate={onNavigate} />
        ) : (
          <LeafLink key={node.id} node={node} depth={0} badges={badges} onNavigate={onNavigate} />
        )
      )}
    </div>
  );
}

export function flattenVisibleLeaves(items, ctx) {
  const visible = filterTree(items, ctx);
  const leaves = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      if (node.children?.length) walk(node.children);
      else if (node.to) leaves.push({ to: node.to, label: node.label, end: node.end });
    });
  };
  walk(visible);
  return leaves;
}
