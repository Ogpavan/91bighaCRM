"use client";

import { useEffect, useMemo, useState } from "react";

type LocalityItem = {
  name: string;
  propertyCount: number;
};

type Props = {
  location?: string;
  limit?: number;
  offset?: number;
  take?: number;
  fallback?: string[];
};

const localityCache = new Map<string, Promise<LocalityItem[]>>();

function fetchLocalities(location: string, limit: number) {
  const key = `${location}::${limit}`;
  const existing = localityCache.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const params = new URLSearchParams({
      location,
      limit: String(limit)
    });
    const res = await fetch(`/api/v1/public/localities?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error("Failed to load localities");
    }

    const data = (await res.json()) as { success?: boolean; items?: LocalityItem[] };
    if (!data?.success || !Array.isArray(data.items)) {
      throw new Error("Invalid localities payload");
    }

    return data.items;
  })();

  localityCache.set(key, promise);
  return promise;
}

export function FooterLocalities({
  location = "Bareilly",
  limit = 12,
  offset = 0,
  take = 6,
  fallback = ["Civil Lines", "Rajendra Nagar", "DD Puram", "Pilibhit Bypass", "Model Town", "Izatnagar"]
}: Props) {
  const [items, setItems] = useState<LocalityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const fetched = await fetchLocalities(location, limit);
        if (!cancelled) setItems(fetched);
      } catch {
        // ignore and keep fallback
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [location, limit]);

  const resolvedLocalities = useMemo(() => {
    const names = (items?.length ? items.map((item) => item.name) : fallback)
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(names));
  }, [fallback, items]);

  const visibleLocalities = resolvedLocalities.slice(offset, offset + take);

  return (
    <ul className="footer-menu">
      {visibleLocalities.map((locality) => {
        const href = `/buy-property-grid-sidebar?${new URLSearchParams({ location, locality }).toString()}`;
        return (
          <li key={locality}>
            <a href={href}>{locality}</a>
          </li>
        );
      })}
    </ul>
  );
}
