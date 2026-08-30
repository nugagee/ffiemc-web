import { DASHBOARD_FEATURES, SITE_PAGES } from "../../data/sitePages";
import {
  allPermissions,
  emptyPermissions,
  setAllPageSections,
  setDashboardPermission,
  setPageAccess,
  setSectionPermission,
} from "../../lib/permissions";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";

const GROUPS = [...new Set(DASHBOARD_FEATURES.map((feature) => feature.group || "Dashboard"))];

function FeatureRow({ feature, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{feature.label}</p>
        <p className="text-xs text-gray-500">{feature.hint}</p>
      </div>
      <div className="flex items-center gap-4">
        {feature.actions.map((action) => (
          <label key={action} className="flex items-center gap-2 text-xs capitalize text-gray-600">
            <Checkbox
              checked={Boolean(value?.[feature.key]?.[action])}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(setDashboardPermission(value, feature.key, action, checked === true))
              }
            />
            {action}
          </label>
        ))}
      </div>
    </div>
  );
}

export function PermissionMatrix({ value, onChange, disabled }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold">Roles and permissions</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tick only the admin areas this account may use. Website pages are listed separately below.
          </p>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onChange(allPermissions())}>
              Allow all
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onChange(emptyPermissions())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {GROUPS.map((group) => (
        <div key={group} className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">{group}</p>
          <div className="space-y-2">
            {DASHBOARD_FEATURES.filter((feature) => (feature.group || "Dashboard") === group).map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                value={value}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">Website pages & contents</p>
        <div className="space-y-3">
          {SITE_PAGES.map((page) => {
            const pagePerms = value?.pages?.[page.key] || { access: false, sections: {} };
            return (
              <div key={page.key} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-gray-50">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      checked={Boolean(pagePerms.access)}
                      disabled={disabled}
                      onCheckedChange={(checked) => onChange(setPageAccess(value, page.key, checked === true))}
                    />
                    {page.label} page
                  </label>
                  {!disabled && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => onChange(setAllPageSections(value, page.key, true))}
                    >
                      All contents
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {page.sections.map((section) => {
                    const actions = section.actions || ["edit"];
                    const sectionPerms = pagePerms.sections?.[section.key] || {};
                    const actionLabels = section.actionLabels || {};
                    return (
                      <div key={section.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm text-gray-800">{section.label}</p>
                          {section.hint ? (
                            <p className="text-xs text-gray-500 mt-0.5">{section.hint}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {actions.map((action) => (
                            <label key={action} className="flex items-center gap-2 text-xs text-gray-600">
                              <Checkbox
                                checked={Boolean(sectionPerms[action])}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                  onChange(setSectionPermission(value, page.key, section.key, action, checked === true))
                                }
                              />
                              {actionLabels[action] || action}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
