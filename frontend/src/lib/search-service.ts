import { apiRequest } from "@/lib/api";

export type SearchItem = {
  id: string;
  label: string;
  sublabel: string | null;
  type: string;
  href: string;
};

type SearchResponse = {
  success: boolean;
  items: SearchItem[];
};

export async function searchApp(query: string) {
  const params = new URLSearchParams({ q: query });
  const response = await apiRequest<SearchResponse>(`/api/v1/search?${params.toString()}`);
  return response.items;
}
