import { PropertyDetailPage } from "@/components/property-detail-page";
import { getPropertyBySlug } from "@/lib/properties";

type BuyPropertyDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function BuyPropertyDetailPage({
  params
}: BuyPropertyDetailPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug, "sale");

  return (
    <PropertyDetailPage
      property={property}
      backHref="/buy-property-grid-sidebar"
      backLabel="Back to buy properties"
    />
  );
}
