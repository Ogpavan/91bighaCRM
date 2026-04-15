import type { HomepageProperty } from "@/lib/properties";

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatIndianCompact(amount: number) {
  if (!Number.isFinite(amount)) {
    return null;
  }

  const abs = Math.abs(amount);

  const formatUnit = (divisor: number, unit: string, decimals: number, joiner = " ") => {
    const scaled = abs / divisor;
    const fixed = trimTrailingZeros(scaled.toFixed(decimals));
    const signed = amount < 0 ? `-${fixed}` : fixed;
    return `Rs. ${signed}${unit ? `${joiner}${unit}` : ""}`.trim();
  };

  if (abs >= 10000000) {
    // Crore
    const scaled = abs / 10000000;
    const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return formatUnit(10000000, "Cr", decimals);
  }

  if (abs >= 100000) {
    // Lakh
    const scaled = abs / 100000;
    const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return formatUnit(100000, "Lakh", decimals);
  }

  if (abs >= 1000) {
    // Thousand (K)
    const scaled = abs / 1000;
    const decimals = scaled < 10 ? 1 : 0;
    return formatUnit(1000, "K", decimals, "");
  }

  const formattedNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(abs);
  return `Rs. ${amount < 0 ? "-" : ""}${formattedNumber}`;
}

export function formatPropertyPrice(property: HomepageProperty) {
  const value = property.listingType === "rent" ? property.rentAmount : property.priceAmount;

  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = formatIndianCompact(value) ?? "Price on request";
    return property.listingType === "rent" ? `${formatted} / month` : formatted;
  }

  if (property.priceLabel) {
    const label = property.priceLabel.trim();
    if (!label) {
      return "Price on request";
    }

    const normalized = /^(₹|rs\.?|inr)\b/i.test(label) ? label : `Rs. ${label}`;
    return property.listingType === "rent" ? `${normalized} / month` : normalized;
  }

  return "Price on request";
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
