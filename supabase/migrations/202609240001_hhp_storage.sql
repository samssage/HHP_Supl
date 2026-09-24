-- HHP durable store v1. Independent of the old prototype schema.sql.
-- JSONB preserves the existing app's typed records; separate tables keep each workflow inspectable.
-- All writes go through the revision-checked RPC. No browser roles can read or write these tables.
create table public.hhp_state (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0 check (revision >= 0),
  initialized boolean not null default false,
  tolerance integer not null default 5 check (tolerance between 0 and 100)
);
insert into public.hhp_state(singleton) values (true);

create table public.hhp_items (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'id')
);

create table public.hhp_audits (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'id')
);

create table public.hhp_kit_edits (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

create table public.hhp_checkouts (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'id')
);

create table public.hhp_stagings (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'id')
);

create table public.hhp_requests (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'id')
);

create table public.hhp_extra_locations (
  id text primary key,
  payload jsonb not null check (jsonb_typeof(payload) = 'object') check (id = payload->>'code')
);

alter table public.hhp_items add constraint hhp_item_quantity check (
  payload ? 'qty' and (payload->'qty' = 'null'::jsonb or
  (jsonb_typeof(payload->'qty') = 'number' and (payload->>'qty')::numeric >= 0
   and (payload->>'qty')::numeric = trunc((payload->>'qty')::numeric)))
);
alter table public.hhp_state enable row level security;
revoke all on public.hhp_state from public, anon, authenticated, service_role;
alter table public.hhp_items enable row level security;
revoke all on public.hhp_items from public, anon, authenticated, service_role;
alter table public.hhp_audits enable row level security;
revoke all on public.hhp_audits from public, anon, authenticated, service_role;
alter table public.hhp_kit_edits enable row level security;
revoke all on public.hhp_kit_edits from public, anon, authenticated, service_role;
alter table public.hhp_checkouts enable row level security;
revoke all on public.hhp_checkouts from public, anon, authenticated, service_role;
alter table public.hhp_stagings enable row level security;
revoke all on public.hhp_stagings from public, anon, authenticated, service_role;
alter table public.hhp_requests enable row level security;
revoke all on public.hhp_requests from public, anon, authenticated, service_role;
alter table public.hhp_extra_locations enable row level security;
revoke all on public.hhp_extra_locations from public, anon, authenticated, service_role;

create table public.hhp_catalog (
  singleton boolean primary key default true check (singleton),
  payload jsonb not null
);
alter table public.hhp_catalog enable row level security;
revoke all on public.hhp_catalog from public, anon, authenticated, service_role;

-- Definer functions have a fixed search path and are executable only by the server service role.
create function public.hhp_read_store() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not (select initialized from public.hhp_state where singleton) then
    raise exception 'Initialize HHP with the reviewed import before using the app';
  end if;
  select jsonb_build_object('revision', s.revision, 'store', jsonb_build_object(
    'tolerancePct', s.tolerance,
    'courses', (select payload->'courses' from public.hhp_catalog where singleton),
    'locations', (select payload->'locations' from public.hhp_catalog where singleton),
    'disposals', (select payload->'disposals' from public.hhp_catalog where singleton),
    'items', coalesce((select jsonb_agg(payload order by id) from public.hhp_items), '[]'::jsonb),
    'audits', coalesce((select jsonb_agg(payload order by id) from public.hhp_audits), '[]'::jsonb),
    'kitEdits', coalesce((select jsonb_agg(payload order by id) from public.hhp_kit_edits), '[]'::jsonb),
    'checkouts', coalesce((select jsonb_agg(payload order by id) from public.hhp_checkouts), '[]'::jsonb),
    'stagings', coalesce((select jsonb_agg(payload order by id) from public.hhp_stagings), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(payload order by id) from public.hhp_requests), '[]'::jsonb),
    'extraLocations', coalesce((select jsonb_agg(payload order by id) from public.hhp_extra_locations), '[]'::jsonb)
  )) into result from public.hhp_state s where singleton;
  return result;
end;
$$;

create function public.hhp_commit_store(expected_revision bigint, changes jsonb, tolerance integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare change jsonb; target_table text; record_id text; record_value jsonb;
begin
  if not (select initialized from public.hhp_state where singleton for update) then
    raise exception 'HHP has not been initialized';
  end if;
  if (select revision from public.hhp_state where singleton) <> expected_revision then
    return false;
  end if;
  if tolerance is null or tolerance < 0 or tolerance > 100 then raise exception 'Invalid tolerance'; end if;
  if changes is null or jsonb_typeof(changes) <> 'array' then raise exception 'Invalid change list'; end if;
  for change in select value from jsonb_array_elements(changes) loop
    target_table := case change->>'bucket'
      when 'items' then 'hhp_items'
      when 'audits' then 'hhp_audits'
      when 'kitEdits' then 'hhp_kit_edits'
      when 'checkouts' then 'hhp_checkouts'
      when 'stagings' then 'hhp_stagings'
      when 'requests' then 'hhp_requests'
      when 'extraLocations' then 'hhp_extra_locations'
      else null end;
    if target_table is null then raise exception 'Unknown inventory collection'; end if;
    record_id := change->>'id';
    record_value := change->'value';
    if record_id is null or record_id = '' or not change ? 'value' then raise exception 'Invalid record'; end if;
    if record_value = 'null'::jsonb then
      execute format('delete from public.%I where id = $1', target_table) using record_id;
    else
      execute format('insert into public.%I(id, payload) values ($1, $2) on conflict(id) do update set payload = excluded.payload', target_table)
        using record_id, record_value;
    end if;
  end loop;
  update public.hhp_state set tolerance = hhp_commit_store.tolerance, revision = revision + 1 where singleton;
  return true;
end;
$$;

-- One-time initialization is separate from normal saves and refuses to overwrite a live store.
create function public.hhp_initialize_store(initial_store jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare changes jsonb := '[]'::jsonb; bucket text; row_value jsonb; record_id text;
begin
  if (select initialized from public.hhp_state where singleton for update) then
    raise exception 'HHP already initialized; import refused';
  end if;
  foreach bucket in array array['items','audits','kitEdits','checkouts','stagings','requests','extraLocations'] loop
    if jsonb_typeof(initial_store->bucket) is distinct from 'array' then raise exception 'Missing collection %', bucket; end if;
    for row_value in select value from jsonb_array_elements(initial_store->bucket) loop
      record_id := case bucket
        when 'extraLocations' then row_value->>'code'
        when 'kitEdits' then '[' || to_jsonb(row_value->>'courseCode')::text || ',' || to_jsonb(row_value->>'itemId')::text || ']'
        else row_value->>'id' end;
      changes := changes || jsonb_build_array(jsonb_build_object('bucket',bucket,'id',record_id,'value',row_value));
    end loop;
  end loop;
  if jsonb_typeof(initial_store->'courses') is distinct from 'array'
     or jsonb_typeof(initial_store->'locations') is distinct from 'array'
     or jsonb_typeof(initial_store->'disposals') is distinct from 'array' then
    raise exception 'Missing reference catalog';
  end if;
  insert into public.hhp_catalog(singleton,payload) values (true,
    jsonb_build_object('courses',initial_store->'courses','locations',initial_store->'locations','disposals',initial_store->'disposals'))
    on conflict(singleton) do update set payload=excluded.payload;
  update public.hhp_state set initialized = true where singleton;
  perform public.hhp_commit_store(0, changes, (initial_store->>'tolerancePct')::integer);
end;
$$;

revoke all on function public.hhp_read_store() from public, anon, authenticated;
revoke all on function public.hhp_commit_store(bigint,jsonb,integer) from public, anon, authenticated;
revoke all on function public.hhp_initialize_store(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.hhp_read_store() to service_role;
grant execute on function public.hhp_commit_store(bigint,jsonb,integer) to service_role;
-- Initial import is run by the database owner in the SQL editor, never through the app.
