import * as XLSX from "xlsx";
import { withDbClient } from "@/lib/db";
import { createLead, ensureCrmLeadsSchema } from "@/lib/crm-leads";
import { createProperty, getPropertyTypeOptions } from "@/lib/properties";

export const LEAD_IMPORT_FIELDS = [
  "name",
  "date",
  "mobileNumber",
  "whatsappNumber",
  "occupation",
  "address",
  "associate",
  "oldFollowup",
  "telecaller",
  "project",
  "recall",
  "remark",
  "source",
  "status"
] as const;

export type LeadImportField = (typeof LEAD_IMPORT_FIELDS)[number];

const HEADER_ALIASES: Record<LeadImportField, string[]> = {
  name: ["name", "lead name", "customer name", "client name"],
  date: ["date", "lead date", "created date"],
  mobileNumber: ["mobile", "mobile number", "phone", "phone number", "contact number"],
  whatsappNumber: ["whatsapp", "whatsapp number", "wa number"],
  occupation: ["occupation", "profession"],
  address: ["address", "location", "full address"],
  associate: ["associate", "associate name", "channel partner", "partner"],
  oldFollowup: ["old followup", "old follow-up", "followup", "follow-up", "last followup"],
  telecaller: ["telecaller", "telecaller name", "assigned to", "assignee"],
  project: ["project", "project name", "property", "property name"],
  recall: ["recall", "recall date", "next followup", "next follow-up", "next call"],
  remark: ["remark", "remarks", "note", "notes", "comment"],
  source: ["source", "lead source"],
  status: ["status", "lead status"]
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded file does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length) {
    throw new Error("The uploaded file does not contain any data rows.");
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  return { headers, rows };
}

function suggestMappings(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const mappings: Partial<Record<LeadImportField, string>> = {};

  for (const field of LEAD_IMPORT_FIELDS) {
    const matched = normalizedHeaders.find((header) => HEADER_ALIASES[field].includes(header.normalized));
    if (matched) {
      mappings[field] = matched.original;
    }
  }

  return mappings;
}

function toOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function toOptionalImportDate(value: unknown) {
  const normalized = toOptionalString(value);
  if (!normalized) {
    return null;
  }

  return Number.isNaN(Date.parse(normalized)) ? null : normalized;
}

async function buildLookupMaps() {
  return withDbClient(async (client) => {
    const [sourcesResult, statusesResult, projectsResult, usersResult] = await Promise.all([
      client.query<{ id: string; name: string; slug: string }>("select id::text as id, name, slug from crm_lead_sources"),
      client.query<{ id: string; name: string; slug: string }>("select id::text as id, name, slug from crm_lead_statuses"),
      client.query<{ id: string; title: string }>("select id::text as id, title from properties where deleted_at is null"),
      client.query<{ id: string; name: string }>("select id::text as id, name from users where is_active = true")
    ]);

    return {
      sources: sourcesResult.rows,
      statuses: statusesResult.rows,
      projects: projectsResult.rows,
      users: usersResult.rows
    };
  });
}

async function createLeadSource(name: string) {
  return withDbClient(async (client) => {
    const slug = normalizeHeader(name).replace(/\s+/g, "-");
    const result = await client.query<{ id: string; name: string; slug: string }>(
      `
        insert into crm_lead_sources (name, slug)
        values ($1, $2)
        on conflict (slug) do update
        set name = excluded.name
        returning id::text as id, name, slug
      `,
      [name, slug]
    );

    return result.rows[0];
  });
}

async function createLeadStatus(name: string) {
  return withDbClient(async (client) => {
    const slug = normalizeHeader(name).replace(/\s+/g, "-");
    const sortOrderResult = await client.query<{ next_sort: string }>(
      "select coalesce(max(sort_order), 0) + 1 as next_sort from crm_lead_statuses"
    );
    const nextSort = Number(sortOrderResult.rows[0]?.next_sort || 1);
    const result = await client.query<{ id: string; name: string; slug: string }>(
      `
        insert into crm_lead_statuses (name, slug, sort_order, is_terminal)
        values ($1, $2, $3, false)
        on conflict (slug) do update
        set name = excluded.name
        returning id::text as id, name, slug
      `,
      [name, slug, nextSort]
    );

    return result.rows[0];
  });
}

function resolveByIdOrName(
  value: string | null,
  items: Array<{ id: string; name?: string; slug?: string; title?: string }>,
  fieldName: string
) {
  if (!value) {
    return null;
  }

  const normalized = normalizeHeader(value);
  const match = items.find((item) => {
    const candidates = [item.id, item.name, item.slug, item.title].filter(Boolean).map((entry) => normalizeHeader(String(entry)));
    return candidates.includes(normalized);
  });

  if (!match) {
    throw new Error(`${fieldName} "${value}" was not found. Use an existing ${fieldName.toLowerCase()} id or exact active name.`);
  }

  return Number(match.id);
}

function resolveOptionalByIdOrName(
  value: string | null,
  items: Array<{ id: string; name?: string; slug?: string; title?: string }>
) {
  if (!value) {
    return null;
  }

  const normalized = normalizeHeader(value);
  const match = items.find((item) => {
    const candidates = [item.id, item.name, item.slug, item.title].filter(Boolean).map((entry) => normalizeHeader(String(entry)));
    return candidates.includes(normalized);
  });

  return match ? Number(match.id) : null;
}

export async function previewLeadImport(fileBuffer: Buffer) {
  await ensureCrmLeadsSchema();
  const { headers, rows } = parseWorkbook(fileBuffer);

  return {
    headers,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 5),
    suggestedMappings: suggestMappings(headers)
  };
}

export async function importLeadsFromFile(input: {
  fileBuffer: Buffer;
  mappings: Partial<Record<LeadImportField, string>>;
  defaultSourceId?: number | null;
  defaultStatusId?: number | null;
  actorUserId: string;
}) {
  await ensureCrmLeadsSchema();
  const { headers, rows } = parseWorkbook(input.fileBuffer);
  const validHeaders = new Set(headers);

  for (const mappedHeader of Object.values(input.mappings)) {
    if (mappedHeader && !validHeaders.has(mappedHeader)) {
      throw new Error(`Mapped column "${mappedHeader}" was not found in the uploaded file.`);
    }
  }

  if (!input.mappings.name || !input.mappings.mobileNumber) {
    throw new Error("Name and Mobile Number mappings are required.");
  }

  if (!input.mappings.source && !input.defaultSourceId) {
    throw new Error("A source column mapping or default source is required.");
  }

  const lookups = await buildLookupMaps();
  const propertyTypes = await getPropertyTypeOptions();
  const defaultPropertyTypeId = propertyTypes[0]?.id;
  const errors: Array<{ row: number; message: string }> = [];
  let importedCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      const getMappedValue = (field: LeadImportField) => {
        const header = input.mappings[field];
        return header ? row[header] : undefined;
      };

      const sourceValue = toOptionalString(getMappedValue("source"));
      const statusValue = toOptionalString(getMappedValue("status"));
      const telecallerValue = toOptionalString(getMappedValue("telecaller"));
      const projectValue = toOptionalString(getMappedValue("project"));
      let projectId: number | null = null;
      let sourceId: number | null = null;
      let statusId: number | null = null;

      if (projectValue !== null) {
        projectId = resolveOptionalByIdOrName(projectValue, lookups.projects);

        if (projectId === null) {
          if (!defaultPropertyTypeId) {
            throw new Error(`Project "${projectValue}" was not found and no property types are configured to create it.`);
          }

          const createdProject = await createProperty({
            title: projectValue,
            listingType: "sale",
            propertyTypeId: defaultPropertyTypeId,
            locality: projectValue,
            city: "Bareilly",
            state: "Uttar Pradesh",
            addressLine1: toOptionalString(getMappedValue("address")),
            source: "lead-import",
            status: "active"
          });

          projectId = Number(createdProject.id);
          lookups.projects.push({
            id: String(createdProject.id),
            title: projectValue
          });
        }
      }

      if (sourceValue !== null) {
        sourceId = resolveOptionalByIdOrName(sourceValue, lookups.sources);

        if (sourceId === null) {
          const createdSource = await createLeadSource(sourceValue);
          sourceId = Number(createdSource.id);
          lookups.sources.push(createdSource);
        }
      }

      if (statusValue !== null) {
        statusId = resolveOptionalByIdOrName(statusValue, lookups.statuses);

        if (statusId === null) {
          const createdStatus = await createLeadStatus(statusValue);
          statusId = Number(createdStatus.id);
          lookups.statuses.push(createdStatus);
        }
      }

      await createLead(
        {
          name: toOptionalString(getMappedValue("name")) || undefined,
          date: toOptionalString(getMappedValue("date")) || undefined,
          mobileNumber: toOptionalString(getMappedValue("mobileNumber")) || undefined,
          whatsappNumber: toOptionalString(getMappedValue("whatsappNumber")) || undefined,
          occupation: toOptionalString(getMappedValue("occupation")) || undefined,
          address: toOptionalString(getMappedValue("address")) || undefined,
          associate: toOptionalString(getMappedValue("associate")) || undefined,
          oldFollowup: toOptionalString(getMappedValue("oldFollowup")) || undefined,
          telecallerId:
            telecallerValue === null ? undefined : resolveOptionalByIdOrName(telecallerValue, lookups.users)?.toString(),
          projectId: projectId === null ? undefined : String(projectId),
          recall: toOptionalImportDate(getMappedValue("recall")) || undefined,
          remark: toOptionalString(getMappedValue("remark")) || undefined,
          sourceId: sourceId ?? input.defaultSourceId ?? undefined,
          statusId: statusId ?? input.defaultStatusId ?? undefined
        },
        input.actorUserId
      );
      importedCount += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Failed to import row."
      });
    }
  }

  return {
    importedCount,
    failedCount: errors.length,
    errors: errors.slice(0, 50)
  };
}
