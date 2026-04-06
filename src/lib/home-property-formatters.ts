import type { HomepageProperty } from "@/lib/properties";

export function formatPropertyPrice(property: HomepageProperty) {
  if (property.priceLabel) {
    return property.priceLabel;
  }

  const value = property.listingType === "rent" ? property.rentAmount : property.priceAmount;

  if (value === null) {
    return "Price on request";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

  return property.listingType === "rent" ? `${formatted} / month` : formatted;
}

export function formatPropertyAddress(property: HomepageProperty) {
  return [property.addressLine1, property.locality, property.city].filter(Boolean).join(", ");
}

export function formatPropertyArea(property: HomepageProperty) {
  if (property.builtupArea === null) {
    return "Area on request";
  }

  return `${property.builtupArea} ${property.builtupAreaUnit || "sqft"}`;
}

const publishedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

export function formatPublishedDate(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return publishedDateFormatter.format(date);
}
