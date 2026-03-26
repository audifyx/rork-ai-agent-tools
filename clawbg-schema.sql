-- ═══════════════════════════════════════════════════════
-- ClawBG Schema
-- Agent-controlled animated HTML app backgrounds
-- ═══════════════════════════════════════════════════════

-- ── Main backgrounds table ──
create table if not exists clawbg_backgrounds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'Untitled',
  type          text not null default 'preset'  -- 'preset' | 'generated' | 'custom'
                check (type in ('preset', 'generated', 'custom')),
  preset        text,                            -- preset name if type=preset
  prompt        text,                            -- AI prompt if type=generated
  html_content  text not null default '',        -- the actual HTML wallpaper
  is_active     boolean not null default false,  -- only one active per user
  status        text not null default 'done'     -- 'generating' | 'done' | 'failed'
                check (status in ('generating', 'done', 'failed')),
  error_message text,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Only one active background per user (partial unique index)
create unique index if not exists clawbg_one_active_per_user
  on clawbg_backgrounds (user_id)
  where is_active = true;

-- ── API keys for direct bg_ access ──
create table if not exists clawbg_api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  key_value     text not null unique,
  label         text default 'ClawBG Key',
  is_active     boolean not null default true,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ── Activity log ──
create table if not exists clawbg_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  description text,
  bg_id       uuid references clawbg_backgrounds(id) on delete set null,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

-- ── Indexes ──
create index if not exists clawbg_backgrounds_user_id on clawbg_backgrounds (user_id);
create index if not exists clawbg_backgrounds_active on clawbg_backgrounds (user_id, is_active);
create index if not exists clawbg_logs_user_id on clawbg_logs (user_id, created_at desc);
create index if not exists clawbg_api_keys_value on clawbg_api_keys (key_value);

-- ── RLS ──
alter table clawbg_backgrounds enable row level security;
alter table clawbg_api_keys    enable row level security;
alter table clawbg_logs        enable row level security;

create policy "Users own their backgrounds"
  on clawbg_backgrounds for all using (auth.uid() = user_id);

create policy "Users own their bg keys"
  on clawbg_api_keys for all using (auth.uid() = user_id);

create policy "Users see their bg logs"
  on clawbg_logs for all using (auth.uid() = user_id);

-- ── Add clawbg permission to master_api_keys ──
-- Run this to add clawbg to any existing master keys:
-- update master_api_keys
-- set permissions = permissions || '{"clawbg": true}'::jsonb
-- where permissions ? 'openclaw';  -- add to all existing openclaw keys

-- ── Helper: get active background HTML (called by app on load) ──
create or replace function get_active_background(p_user_id uuid)
returns text
language sql security definer as $$
  select html_content
  from clawbg_backgrounds
  where user_id = p_user_id
    and is_active = true
    and status = 'done'
  order by updated_at desc
  limit 1;
$$;
