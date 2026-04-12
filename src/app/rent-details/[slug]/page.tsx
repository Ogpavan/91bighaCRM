import { PropertyDetailPage } from "@/components/property-detail-page";
import { getPropertyBySlug } from "@/lib/properties";

type RentPropertyDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RentPropertyDetailPage({
  params
}: RentPropertyDetailPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug, "rent");

  return (
    <PropertyDetailPage
      property={property}
      backHref="/rent-property-grid-sidebar"
      backLabel="Back to rent properties"
    />
  );
}
