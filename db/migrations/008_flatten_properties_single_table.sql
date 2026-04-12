begin;

alter table properties
  alter column property_type_id drop not null,
  alter column location_id drop not null;

alter table properties
  add column if not exists property_type varchar(100),
  add column if not exists country varchar(100) default 'India',
  add column if not exists city varchar(100) default 'Bareilly',
  add column if not exists state varchar(100) default 'Uttar Pradesh',
  add column if not exists locality varchar(120),
  add column if not exists sub_locality varchar(120),
  add column if not exists address_line1 varchar(255),
  add column if not exists address_line2 varchar(255),
  add column if not exists landmark varchar(255),
  add column if not exists pincode varchar(12),
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists price_amount numeric(14,2),
  add column if not exists rent_amount numeric(14,2),
  add column if not exists security_deposit numeric(14,2),
  add column if not exists maintenance_amount numeric(14,2),
  add column if not exists price_label varchar(120),
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists balconies integer,
  add column if not exists floor_number integer,
  add column if not exists floors_total integer,
  add column if not exists builtup_area numeric(12,2),
  add column if not exists builtup_area_unit varchar(20) default 'sqft',
  add column if not exists carpet_area numeric(12,2),
  add column if not exists plot_area numeric(12,2),
  add column if not exists parking_count integer,
  add column if not exists furnishing_status varchar(30),
  add column if not exists age_of_property integer,
  add column if not exists cover_image text,
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists features jsonb not null default '[]'::jsonb;

update properties p
set
  property_type = coalesce(
    p.property_type,
    (select pt.name from property_types pt where pt.id = p.property_type_id)
  ),
  country = coalesce(
    p.country,
    (select l.country from property_locations l where l.id = p.location_id),
    'India'
  ),
  city = coalesce(
    p.city,
    (select l.city from property_locations l where l.id = p.location_id),
    'Bareilly'
  ),
  state = coalesce(
    p.state,
    (select l.state from property_locations l where l.id = p.location_id),
    'Uttar Pradesh'
  ),
  locality = coalesce(
    p.locality,
    (select l.locality from property_locations l where l.id = p.location_id)
  ),
  sub_locality = coalesce(
    p.sub_locality,
    (select l.sub_locality from property_locations l where l.id = p.location_id)
  ),
  address_line1 = coalesce(
    p.address_line1,
    (select l.address_line1 from property_locations l where l.id = p.location_id)
  ),
  address_line2 = coalesce(
    p.address_line2,
    (select l.address_line2 from property_locations l where l.id = p.location_id)
  ),
  landmark = coalesce(
    p.landmark,
    (select l.landmark from property_locations l where l.id = p.location_id)
  ),
  pincode = coalesce(
    p.pincode,
    (select l.pincode from property_locations l where l.id = p.location_id)
  ),
  latitude = coalesce(
    p.latitude,
    (select l.latitude from property_locations l where l.id = p.location_id)
  ),
  longitude = coalesce(
    p.longitude,
    (select l.longitude from property_locations l where l.id = p.location_id)
  ),
  price_amount = coalesce(
    p.price_amount,
    (select pr.price_amount from property_pricing pr where pr.property_id = p.id and pr.effective_to is null order by pr.effective_from desc nulls last, pr.id desc limit 1)
  ),
  rent_amount = coalesce(
    p.rent_amount,
    (select pr.rent_amount from property_pricing pr where pr.property_id = p.id and pr.effective_to is null order by pr.effective_from desc nulls last, pr.id desc limit 1)
  ),
  security_deposit = coalesce(
    p.security_deposit,
    (select pr.security_deposit from property_pricing pr where pr.property_id = p.id and pr.effective_to is null order by pr.effective_from desc nulls last, pr.id desc limit 1)
  ),
  maintenance_amount = coalesce(
    p.maintenance_amount,
    (select pr.maintenance_amount from property_pricing pr where pr.property_id = p.id and pr.effective_to is null order by pr.effective_from desc nulls last, pr.id desc limit 1)
  ),
  price_label = coalesce(
    p.price_label,
    (select pr.price_label from property_pricing pr where pr.property_id = p.id and pr.effective_to is null order by pr.effective_from desc nulls last, pr.id desc limit 1)
  ),
  bedrooms = coalesce(
    p.bedrooms,
    (select ps.bedrooms from property_specs ps where ps.property_id = p.id)
  ),
  bathrooms = coalesce(
    p.bathrooms,
    (select ps.bathrooms from property_specs ps where ps.property_id = p.id)
  ),
  balconies = coalesce(
    p.balconies,
    (select ps.balconies from property_specs ps where ps.property_id = p.id)
  ),
  floor_number = coalesce(
    p.floor_number,
    (select ps.floor_number from property_specs ps where ps.property_id = p.id)
  ),
  floors_total = coalesce(
    p.floors_total,
    (select ps.floors_total from property_specs ps where ps.property_id = p.id)
  ),
  builtup_area = coalesce(
    p.builtup_area,
    (select ps.builtup_area from property_specs ps where ps.property_id = p.id)
  ),
  builtup_area_unit = coalesce(
    p.builtup_area_unit,
    (select ps.builtup_area_unit from property_specs ps where ps.property_id = p.id),
    'sqft'
  ),
  carpet_area = coalesce(
    p.carpet_area,
    (select ps.carpet_area from property_specs ps where ps.property_id = p.id)
  ),
  plot_area = coalesce(
    p.plot_area,
    (select ps.plot_area from property_specs ps where ps.property_id = p.id)
  ),
  parking_count = coalesce(
    p.parking_count,
    (select ps.parking_count from property_specs ps where ps.property_id = p.id)
  ),
  furnishing_status = coalesce(
    p.furnishing_status,
    (select ps.furnishing_status from property_specs ps where ps.property_id = p.id)
  ),
  age_of_property = coalesce(
    p.age_of_property,
    (select ps.age_of_property from property_specs ps where ps.property_id = p.id)
  ),
  cover_image = coalesce(
    p.cover_image,
    (select pm.file_url from property_media pm where pm.property_id = p.id order by pm.is_cover desc, pm.sort_order asc, pm.created_at asc limit 1)
  ),
  image_urls = case
    when p.image_urls <> '[]'::jsonb then p.image_urls
    else coalesce(
      (
        select jsonb_agg(pm.file_url order by pm.is_cover desc, pm.sort_order asc, pm.created_at asc)
        from property_media pm
        where pm.property_id = p.id
      ),
      '[]'::jsonb
    )
  end,
  features = case
    when p.features <> '[]'::jsonb then p.features
    else coalesce(
      (
        select jsonb_agg(pf.name order by pf.name asc)
        from property_feature_map pfm
        inner join property_features pf on pf.id = pfm.feature_id
        where pfm.property_id = p.id
      ),
      '[]'::jsonb
    )
  end;

update properties
set
  property_type = coalesce(nullif(trim(property_type), ''), 'Apartment'),
  country = coalesce(nullif(trim(country), ''), 'India'),
  city = coalesce(nullif(trim(city), ''), 'Bareilly'),
  state = coalesce(nullif(trim(state), ''), 'Uttar Pradesh'),
  builtup_area_unit = coalesce(nullif(trim(builtup_area_unit), ''), 'sqft');

create index if not exists idx_properties_property_type_flat on properties(property_type);
create index if not exists idx_properties_city_locality_flat on properties(city, locality);

commit;
