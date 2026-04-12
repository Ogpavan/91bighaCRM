begin;

drop index if exists idx_properties_property_type_id;
drop index if exists idx_properties_location_id;

alter table properties
  drop column if exists property_type_id,
  drop column if exists location_id;

drop table if exists property_feature_map;
drop table if exists property_features;
drop table if exists property_media;
drop table if exists property_specs;
drop table if exists property_pricing;
drop table if exists property_locations;
drop table if exists property_types;

commit;
