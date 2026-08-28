import { ChurchInfoPanel } from "../../components/admin/ChurchInfoPanel";

export default function WebsitePage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold mb-2">CMS</p>
      <ChurchInfoPanel />
    </div>
  );
}
