create table bids (
  id bigint generated always as identity primary key,
  handle text not null,
  platform text not null,
  tagline text default '',
  bid numeric not null,
  clicks integer default 0,
  ts bigint not null,
  unique (handle, platform)
);

-- Row Level Security: lock the table down so only your server-side
-- functions (using the service key) can write to it.
alter table bids enable row level security;

create policy "public can read"
  on bids for select
  using (true);

-- Optional starter rows so the board isn't empty on launch
insert into bids (handle, platform, tagline, bid, clicks, ts) values
  ('@wavydrip', 'tiktok', 'daily outfit drops, new vid every night', 25, 1200, 1),
  ('@studio.north', 'instagram', 'minimal home decor finds', 20, 812, 2),
  ('shopcosmic.co', 'link', '20% off everything this week', 15, 530, 3),
  ('@ramenwithred', 'tiktok', 'best ramen spots in your city', 10, 298, 4),
  ('@fitwithmara', 'tiktok', 'free 7-day workout plan in bio', 8, 176, 5);
