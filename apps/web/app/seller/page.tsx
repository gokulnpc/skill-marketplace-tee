import { SellerScreen } from "@/components/screens/SellerScreen";
import { enrichSkills } from "@/lib/catalog";
import { fetchSellerBalance, fetchSkills } from "@/lib/api";
import { DEFAULT_SELLER_ID } from "@/lib/constants";

export default async function SellerPage() {
  const [skills, balance] = await Promise.all([
    fetchSkills(),
    fetchSellerBalance(DEFAULT_SELLER_ID),
  ]);

  const listings = enrichSkills(skills).filter((s) => s.seller_id === DEFAULT_SELLER_ID);

  return (
    <SellerScreen sellerId={DEFAULT_SELLER_ID} balance={balance} listings={listings} />
  );
}
