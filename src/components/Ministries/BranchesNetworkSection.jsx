import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Church,
  GraduationCap,
  MapPin,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useChurchNetwork } from "../../hooks/useChurchNetwork";
import { BRANCH_TYPE_LABELS } from "../../data/churchBranches";

const TYPE_ICONS = {
  headquarters: Building2,
  assembly: Church,
  campus: GraduationCap,
};

function BranchCard({ branch, featured = false, onSelect }) {
  const Icon = TYPE_ICONS[branch.branchType] || Church;
  const typeLabel = BRANCH_TYPE_LABELS[branch.branchType] || "Assembly";

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={() => onSelect?.(branch)}
      className={`group w-full text-left rounded-2xl border transition-all duration-300 ${
        featured
          ? "border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 shadow-lg shadow-red-100/60"
          : "border-gray-100 bg-white hover:border-red-200 hover:shadow-lg hover:shadow-red-50"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2.5 rounded-xl ${featured ? "bg-red-600 text-white" : "bg-red-50 text-red-600"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
            {typeLabel}
          </Badge>
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900 group-hover:text-red-700 transition-colors">
          {branch.name}
        </h3>
        {branch.districtName && (
          <p className="text-xs font-medium text-red-600 mt-1">{branch.districtName}</p>
        )}
        {(branch.city || branch.state) && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {[branch.city, branch.state].filter(Boolean).join(", ")}
          </p>
        )}
        {branch.description && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2 leading-relaxed">{branch.description}</p>
        )}
      </div>
    </motion.button>
  );
}

function DistrictPanel({ group, activeBranchId, onSelectBranch }) {
  const { district, branches } = group;

  return (
    <motion.div
      layout
      className="rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/30 to-orange-50/40 overflow-hidden"
    >
      <div className="p-6 sm:p-8 border-b border-red-100/80 bg-white/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-600 text-white">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{district.name}</h3>
            {district.description && (
              <p className="text-gray-600 mt-1 max-w-2xl">{district.description}</p>
            )}
          </div>
          <Badge className="ml-auto bg-red-100 text-red-700 hover:bg-red-100">
            {branches.length} {branches.length === 1 ? "assembly" : "assemblies"}
          </Badge>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        {branches.length === 0 ? (
          <p className="text-sm text-gray-500">Assemblies for this district will appear here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={{ ...branch, districtName: district.name }}
                featured={activeBranchId === branch.id}
                onSelect={onSelectBranch}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BranchesNetworkSection({ intro }) {
  const { network, loading } = useChurchNetwork();
  const [activeBranch, setActiveBranch] = useState(null);
  const [tab, setTab] = useState("overview");

  const hq = network.headquarters[0];

  const stats = useMemo(
    () => [
      { label: "Branches & Assemblies", value: network.stats.branches },
      { label: "Districts", value: network.stats.districts },
      { label: "Campus Fellowships", value: network.stats.campuses },
      { label: "Local Assemblies", value: network.stats.assemblies },
    ],
    [network.stats]
  );

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">Loading church network…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white via-gray-50/50 to-white" data-testid="branches-network">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {intro && (
          <p className="text-center text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">{intro}</p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border bg-white px-5 py-6 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-3xl font-bold text-red-600">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {hq && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white shadow-2xl shadow-red-200"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-8 p-8 sm:p-10 lg:p-12 items-center">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-white/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Headquarters
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold">{hq.name}</h2>
                <p className="text-red-100 text-lg leading-relaxed max-w-xl">
                  {hq.description || "The mother church — where the fire was kindled and the vision continues to spread across districts and campuses."}
                </p>
                <div className="flex items-center gap-2 text-red-100">
                  <MapPin className="h-4 w-4" />
                  {[hq.city, hq.state, hq.country].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 space-y-4">
                <p className="text-sm uppercase tracking-widest text-red-100">Our reach</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold">{network.stats.districts}</p>
                    <p className="text-sm text-red-100">Districts</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{network.stats.branches - 1}</p>
                    <p className="text-sm text-red-100">Outreach points</p>
                  </div>
                </div>
                <Button asChild variant="secondary" className="w-full bg-white text-red-700 hover:bg-red-50">
                  <Link to="/contact">
                    Plan a visit
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="space-y-8">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 justify-center">
            {[
              { id: "overview", label: "Overview" },
              { id: "districts", label: "Districts" },
              { id: "assemblies", label: "Assemblies" },
              { id: "campuses", label: "Campuses" },
            ].map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="rounded-full px-5 py-2 data-[state=active]:bg-red-600 data-[state=active]:text-white border border-gray-200 bg-white"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-0">
            <div className="grid lg:grid-cols-2 gap-6">
              {network.districtGroups.map((group) => (
                <Card key={group.district.id} className="border-red-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-red-600" />
                      {group.district.name}
                    </CardTitle>
                    <CardDescription>{group.district.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-2">
                      {group.branches.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => setActiveBranch(b)}
                            className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <span className="font-medium text-gray-800">{b.name}</span>
                            <ChevronRight className="h-4 w-4 text-red-400" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            {network.campuses.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-red-600" />
                  Campus Fellowships
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {network.campuses.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} onSelect={setActiveBranch} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="districts" className="space-y-8 mt-0">
            {network.districtGroups.map((group) => (
              <DistrictPanel
                key={group.district.id}
                group={group}
                activeBranchId={activeBranch?.id}
                onSelectBranch={setActiveBranch}
              />
            ))}
          </TabsContent>

          <TabsContent value="assemblies" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {network.assemblies.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  featured={activeBranch?.id === branch.id}
                  onSelect={setActiveBranch}
                />
              ))}
            </div>
            {network.standaloneAssemblies.length > 0 && network.districtGroups.some((g) => g.branches.length) && (
              <p className="text-center text-sm text-gray-500 mt-8">
                Assemblies are also grouped under their districts in the Districts tab.
              </p>
            )}
          </TabsContent>

          <TabsContent value="campuses" className="mt-0">
            <div className="grid sm:grid-cols-2 gap-6">
              {network.campuses.map((branch) => (
                <BranchCard key={branch.id} branch={branch} featured onSelect={setActiveBranch} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {activeBranch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setActiveBranch(null)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-8 text-white">
                  <Badge className="bg-white/20 text-white hover:bg-white/20 mb-3">
                    {BRANCH_TYPE_LABELS[activeBranch.branchType]}
                  </Badge>
                  <h3 className="text-2xl font-bold">{activeBranch.name}</h3>
                  {activeBranch.districtName && (
                    <p className="text-red-100 mt-1">{activeBranch.districtName}</p>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  {activeBranch.description && (
                    <p className="text-gray-600 leading-relaxed">{activeBranch.description}</p>
                  )}
                  {(activeBranch.city || activeBranch.state) && (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 text-red-500" />
                      {[activeBranch.city, activeBranch.state, activeBranch.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button asChild className="bg-red-600 hover:bg-red-700 flex-1">
                      <Link to="/contact">Get directions</Link>
                    </Button>
                    <Button variant="outline" onClick={() => setActiveBranch(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
