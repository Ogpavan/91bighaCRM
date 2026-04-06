import { getDb, withDbClient } from "@/lib/db";

export type PropertyTypeOption = {
  id: number;
  name: string;
  slug: string;
};

export type HomepageProperty = {
  id: string;
  propertyCode: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  listingType: string;
  propertyType: string;
  locality: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  priceAmount: number | null;
  rentAmount: number | null;
  priceLabel: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtupArea: number | null;
  builtupAreaUnit: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  publishedAt: string | null;
};

export type PropertyTypeCount = {
  name: string;
  slug: string;
  propertyCount: number;
};

export type CreatePropertyInput = {
  title: string;
  description?: string | null;
  listingType: string;
  propertyTypeId: number;
  locality: string;
  city?: string | null;
  state?: string | null;
  addressLine1?: string | null;
  pincode?: string | null;
  status?: string | null;
  possessionStatus?: string | null;
  priceAmount?: number | null;
  rentAmount?: number | null;
  securityDeposit?: number | null;
  maintenanceAmount?: number | null;
  priceLabel?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  floorNumber?: number | null;
  floorsTotal?: number | null;
  builtupArea?: number | null;
  builtupAreaUnit?: string | null;
  parkingCount?: number | null;
  furnishingStatus?: string | null;
  ageOfProperty?: number | null;
  facing?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  imageUrls?: string[] | null;
  source?: string | null;
  isFeatured?: boolean;
  isVerified?: boolean;
};

type RawHomepageProperty = {
  id: string;
  property_code: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  listing_type: string;
  property_type: string;
  locality: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  price_amount: string | null;
  rent_amount: string | null;
  price_label: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtup_area: string | null;
  builtup_area_unit: string | null;
  cover_image: string | null;
  is_featured: boolean;
  is_verified: boolean;
  published_at: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  if (lower === "null" || lower === "undefined") {
    return null;
  }

  return normalized;
}

function mapHomepageProperty(row: RawHomepageProperty): HomepageProperty {
  return {
    id: row.id,
    propertyCode: row.property_code,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    listingType: row.listing_type,
    propertyType: row.property_type,
    locality: row.locality,
    city: row.city,
    state: row.state,
    addressLine1: row.address_line1,
    priceAmount: normalizeNumber(row.price_amount),
    rentAmount: normalizeNumber(row.rent_amount),
    priceLabel: row.price_label,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    builtupArea: normalizeNumber(row.builtup_area),
    builtupAreaUnit: row.builtup_area_unit,
    coverImage: normalizeImageUrl(row.cover_image),
    isFeatured: row.is_featured,
    isVerified: row.is_verified,
    publishedAt: row.published_at
  };
}

export async function getPropertyTypeOptions() {
  const db = await getDb();
  const result = await db.query<PropertyTypeOption>(
    `select id::int, name, slug from property_types order by name asc`
  );

  return result.rows;
}

export async function listHomepageProperties(listingType: string, limit = 6) {
  const db = await getDb();
  const result = await db.query<RawHomepageProperty>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        pt.name as property_type,
        l.locality,
        l.city,
        l.state,
        l.address_line1,
        pr.price_amount::text,
        pr.rent_amount::text,
        pr.price_label,
        ps.bedrooms,
        ps.bathrooms,
        ps.builtup_area::text,
        ps.builtup_area_unit,
        pm.file_url as cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      inner join property_types pt on pt.id = p.property_type_id
      inner join property_locations l on l.id = p.location_id
      left join property_pricing pr on pr.property_id = p.id and pr.effective_to is null
      left join property_specs ps on ps.property_id = p.id
      left join lateral (
        select file_url
        from property_media
        where property_id = p.id
        order by is_cover desc, sort_order asc, created_at asc
        limit 1
      ) pm on true
      where p.deleted_at is null
        and p.status = 'active'
        and p.listing_type = $1
      order by p.is_featured desc, coalesce(p.published_at, p.created_at) desc
      limit $2
    `,
    [listingType, limit]
  );

  return result.rows.map(mapHomepageProperty);
}

export async function listPropertyTypeCounts(limit = 6) {
  const db = await getDb();
  const result = await db.query<{
    name: string;
    slug: string;
    property_count: string;
  }>(
    `
      select
        pt.name,
        pt.slug,
        count(p.id)::text as property_count
      from property_types pt
      left join properties p
        on p.property_type_id = pt.id
       and p.deleted_at is null
       and p.status = 'active'
      group by pt.id, pt.name, pt.slug
      order by count(p.id) desc, pt.name asc
      limit $1
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    propertyCount: Number(row.property_count)
  }));
}

export async function listApiProperties(limit = 50) {
  const db = await getDb();
  const result = await db.query<RawHomepageProperty>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        pt.name as property_type,
        l.locality,
        l.city,
        l.state,
        l.address_line1,
        pr.price_amount::text,
        pr.rent_amount::text,
        pr.price_label,
        ps.bedrooms,
        ps.bathrooms,
        ps.builtup_area::text,
        ps.builtup_area_unit,
        pm.file_url as cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      inner join property_types pt on pt.id = p.property_type_id
      inner join property_locations l on l.id = p.location_id
      left join property_pricing pr on pr.property_id = p.id and pr.effective_to is null
      left join property_specs ps on ps.property_id = p.id
      left join lateral (
        select file_url
        from property_media
        where property_id = p.id
        order by is_cover desc, sort_order asc, created_at asc
        limit 1
      ) pm on true
      where p.deleted_at is null
      order by coalesce(p.published_at, p.created_at) desc
      limit $1
    `,
    [limit]
  );

  return result.rows.map(mapHomepageProperty);
}

export async function createProperty(input: CreatePropertyInput) {
  const codeSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slugBase = slugify(`${input.title}-${input.locality}`);
  const propertyCode = `PROP-${codeSeed.toUpperCase()}`;
  const propertySlug = `${slugBase || "property"}-${codeSeed}`;

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const locationResult = await client.query<{ id: string }>(
        `
          insert into property_locations (
            country,
            state,
            city,
            locality,
            address_line1,
            pincode,
            latitude,
            longitude
          )
          values ('India', $1, $2, $3, $4, $5, $6, $7)
          returning id::text
        `,
        [
          input.state || "Uttar Pradesh",
          input.city || "Bareilly",
          input.locality,
          input.addressLine1 || null,
          input.pincode || null,
          input.latitude ?? null,
          input.longitude ?? null
        ]
      );

      const locationId = locationResult.rows[0]?.id;

      const propertyResult = await client.query<{ id: string }>(
        `
          insert into properties (
            property_code,
            title,
            slug,
            description,
            status,
            listing_type,
            possession_status,
            property_type_id,
            location_id,
            facing,
            source,
            is_featured,
            is_verified,
            published_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
          returning id::text
        `,
        [
          propertyCode,
          input.title,
          propertySlug,
          input.description || null,
          input.status || "active",
          input.listingType,
          input.possessionStatus || null,
          input.propertyTypeId,
          locationId,
          input.facing || null,
          input.source || "manual",
          Boolean(input.isFeatured),
          Boolean(input.isVerified)
        ]
      );

      const propertyId = propertyResult.rows[0]?.id;

      await client.query(
        `
          insert into property_pricing (
            property_id,
            price_amount,
            rent_amount,
            security_deposit,
            maintenance_amount,
            price_label
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          propertyId,
          input.priceAmount ?? null,
          input.rentAmount ?? null,
          input.securityDeposit ?? null,
          input.maintenanceAmount ?? null,
          input.priceLabel || null
        ]
      );

      await client.query(
        `
          insert into property_specs (
            property_id,
            bedrooms,
            bathrooms,
            balconies,
            floors_total,
            floor_number,
            builtup_area,
            builtup_area_unit,
            parking_count,
            furnishing_status,
            age_of_property
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          propertyId,
          input.bedrooms ?? null,
          input.bathrooms ?? null,
          input.balconies ?? null,
          input.floorsTotal ?? null,
          input.floorNumber ?? null,
          input.builtupArea ?? null,
          input.builtupAreaUnit || "sqft",
          input.parkingCount ?? null,
          input.furnishingStatus || null,
          input.ageOfProperty ?? null
        ]
      );

      const mediaUrls = Array.from(
        new Set(
          [input.coverImageUrl, ...(input.imageUrls || [])]
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );

      for (const [index, url] of mediaUrls.entries()) {
        await client.query(
          `
            insert into property_media (
              property_id,
              media_type,
              file_url,
              alt_text,
              sort_order,
              is_cover
            )
            values ($1, 'image', $2, $3, $4, $5)
          `,
          [propertyId, url, input.title, index, index === 0]
        );
      }

      await client.query("commit");

      return {
        id: propertyId,
        propertyCode,
        slug: propertySlug
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
