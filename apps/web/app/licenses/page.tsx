import { LicensesScreen } from "@/components/screens/LicensesScreen";
import { enrichSkills } from "@/lib/catalog";
import { fetchBuyerBalance, fetchBuyerLicenses, fetchSkills } from "@/lib/api";
import { DEFAULT_BUYER_ID } from "@/lib/constants";

export default async function LicensesPage() {
  const [skills, balance, licenses] = await Promise.all([
    fetchSkills(),
    fetchBuyerBalance(DEFAULT_BUYER_ID),
    fetchBuyerLicenses(DEFAULT_BUYER_ID),
  ]);

  return (
    <LicensesScreen
      buyerId={DEFAULT_BUYER_ID}
      balance={balance}
      licenses={licenses}
      skills={enrichSkills(skills)}
    />
  );
}
