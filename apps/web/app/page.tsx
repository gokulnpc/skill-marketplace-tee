import { BrowseScreen } from "@/components/screens/BrowseScreen";
import { enrichSkills } from "@/lib/catalog";
import { fetchSkills } from "@/lib/api";

export default async function HomePage() {
  const skills = enrichSkills(await fetchSkills());
  return <BrowseScreen skills={skills} />;
}
