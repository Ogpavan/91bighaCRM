"use client";

import { useMemo, useState } from "react";
import type { PropertyTypeOption } from "@/lib/properties";

type HomeSearchFormProps = {
  listingType: "sale" | "rent";
  action: string;
  propertyTypeOptions: PropertyTypeOption[];
  minAllowedPrice: number | null;
  maxAllowedPrice: number | null;
};

export function HomeSearchForm({
  listingType,
  action,
  propertyTypeOptions,
  minAllowedPrice,
  maxAllowedPrice
}: HomeSearchFormProps) {
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");

  const priceMinLabel = listingType === "rent" ? "Min Rent" : "Min Budget";
  const priceMaxLabel = listingType === "rent" ? "Max Rent" : "Max Budget";
  const priceMinPlaceholder = listingType === "rent" ? "8000" : "2500000";
  const priceMaxPlaceholder = listingType === "rent" ? "35000" : "20000000";
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-IN"), []);

  const formatAmountForInput = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    if (!digitsOnly) {
      return "";
    }
    return numberFormatter.format(Number(digitsOnly));
  };

  const parseInputAmount = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    if (!digitsOnly) {
      return null;
    }
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const minPriceValue = parseInputAmount(minPriceInput);
  const maxPriceValue = parseInputAmount(maxPriceInput);
  const isMinBelowAllowed =
    typeof minAllowedPrice === "number" &&
    typeof minPriceValue === "number" &&
    minPriceValue < minAllowedPrice;
  const isMaxAboveAllowed =
    typeof maxAllowedPrice === "number" &&
    typeof maxPriceValue === "number" &&
    maxPriceValue > maxAllowedPrice;
  const isMinGreaterThanMax =
    typeof minPriceValue === "number" &&
    typeof maxPriceValue === "number" &&
    minPriceValue > maxPriceValue;
  const hasPriceValidationError = isMinBelowAllowed || isMaxAboveAllowed || isMinGreaterThanMax;
  return (
    <form action={action} method="get">
      <div className="d-flex align-items-bottom flex-wrap flex-lg-nowrap gap-3">
        <div className="flex-fill select-field w-100">
          <label className="form-label">Property Type</label>
          <select className="form-select" name="propertyType" defaultValue="">
            <option value="">All Types</option>
            {propertyTypeOptions.map((option) => (
              <option key={option.slug} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-fill select-field w-100">
          <label className="form-label">{priceMinLabel}</label>
          <input
            type="text"
            name="minPrice"
            inputMode="numeric"
            className="form-control"
            placeholder={priceMinPlaceholder}
            value={minPriceInput}
            onChange={(event) => setMinPriceInput(formatAmountForInput(event.target.value))}
          />
          {isMinBelowAllowed ? (
            <p className="mb-0 mt-1 text-danger fs-13">
              Minimum allowed is {numberFormatter.format(minAllowedPrice as number)}.
            </p>
          ) : null}
        </div>

        <div className="flex-fill select-field w-100">
          <label className="form-label">{priceMaxLabel}</label>
          <input
            type="text"
            name="maxPrice"
            inputMode="numeric"
            className="form-control"
            placeholder={priceMaxPlaceholder}
            value={maxPriceInput}
            onChange={(event) => setMaxPriceInput(formatAmountForInput(event.target.value))}
          />
          {isMaxAboveAllowed ? (
            <p className="mb-0 mt-1 text-danger fs-13">
              Maximum allowed is {numberFormatter.format(maxAllowedPrice as number)}.
            </p>
          ) : null}
          {isMinGreaterThanMax ? (
            <p className="mb-0 mt-1 text-danger fs-13">Max budget must be greater than or equal to min budget.</p>
          ) : null}
        </div>

        <div className="custom-search-item d-flex align-items-end">
          <button type="submit" className="btn btn-primary" disabled={hasPriceValidationError}>
            <i className="material-icons-outlined">search</i>
          </button>
        </div>
      </div>
    </form>
  );
}
