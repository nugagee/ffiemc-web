import { useEffect, useMemo, useState } from "react";
import { listPublicChurchBranches, listPublicChurchDistricts } from "../lib/api";
import {
  CHURCH_BRANCHES,
  CHURCH_DISTRICTS,
  groupChurchNetwork,
  normalizeBranch,
  normalizeDistrict,
} from "../data/churchBranches";

export function useChurchNetwork() {
  const [branches, setBranches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      listPublicChurchBranches().catch(() => []),
      listPublicChurchDistricts().catch(() => []),
    ])
      .then(([branchRows, districtRows]) => {
        if (!active) return;
        const b = Array.isArray(branchRows) && branchRows.length ? branchRows : CHURCH_BRANCHES;
        const d = Array.isArray(districtRows) && districtRows.length ? districtRows : CHURCH_DISTRICTS;
        setBranches(b.map(normalizeBranch));
        setDistricts(d.map(normalizeDistrict));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const network = useMemo(() => groupChurchNetwork(branches, districts), [branches, districts]);

  return { branches, districts, network, loading };
}
