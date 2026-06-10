-- ═══════════════════════════════════════════════════════════════
-- NANDY GOVI — Schema Supabase-only
-- Roda no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- Extensão UUID
create extension if not exists "uuid-ossp";

-- ── TABELAS PRINCIPAIS ───────────────────────────────────────────

-- Usuários (espelho do Supabase Auth + dados extras)
create table if not exists usuarios (
  id            uuid primary key default uuid_generate_v4(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  nome          text not null,
  email         text unique not null,
  role          text not null default 'cliente' check (role in ('cliente','admin')),
  ativo         boolean default true,
  created_at    timestamptz default now()
);

-- Categorias
create table if not exists categorias (
  id          serial primary key,
  nome        text not null,
  slug        text unique not null,
  descricao   text,
  ativo       boolean default true
);

-- Tamanhos
create table if not exists tamanhos (
  id          serial primary key,
  codigo      text unique not null,
  descricao   text not null,
  dimensoes   text,
  preco_extra numeric(10,2) default 0
);

-- Acabamentos
create table if not exists acabamentos (
  id          serial primary key,
  codigo      text unique not null,
  nome        text not null,
  descricao   text,
  preco_extra numeric(10,2) default 0,
  ativo       boolean default true
);

-- Produtos
create table if not exists produtos (
  id          uuid primary key default uuid_generate_v4(),
  titulo      text not null,
  descricao   text,
  preco_base  numeric(10,2) not null,
  imagem_url  text,
  categoria_id int references categorias(id),
  ativo       boolean default true,
  destaque    boolean default false,
  estoque     int default 999,
  created_at  timestamptz default now()
);

-- Cupons de desconto
create table if not exists cupons (
  id          serial primary key,
  codigo      text unique not null,
  tipo        text not null check (tipo in ('percentual','fixo')),
  valor       numeric(10,2) not null,
  ativo       boolean default true,
  validade    date
);

-- Pedidos
create table if not exists pedidos (
  id                uuid primary key default uuid_generate_v4(),
  usuario_id        uuid references usuarios(id),
  numero            text unique not null,
  subtotal          numeric(10,2) not null,
  desconto          numeric(10,2) default 0,
  frete             numeric(10,2) default 0,
  total             numeric(10,2) not null,
  status            text default 'aguardando_pagamento',
  status_pagamento  text default 'pendente',
  endereco_json     jsonb,
  chave_pix         text,
  mp_payment_id     text,
  rastreio          text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Itens do pedido
create table if not exists pedido_itens (
  id              serial primary key,
  pedido_id       uuid references pedidos(id) on delete cascade,
  produto_id      uuid references produtos(id),
  tamanho_id      int references tamanhos(id),
  acabamento_id   int references acabamentos(id),
  quantidade      int not null,
  preco_unit      numeric(10,2) not null,
  nome_produto    text
);

-- Banners (opcional)
create table if not exists banners (
  id      serial primary key,
  titulo  text,
  imagem  text,
  link    text,
  ativo   boolean default true,
  ordem   int default 0
);

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────

alter table usuarios      enable row level security;
alter table produtos      enable row level security;
alter table categorias    enable row level security;
alter table tamanhos      enable row level security;
alter table acabamentos   enable row level security;
alter table pedidos       enable row level security;
alter table pedido_itens  enable row level security;
alter table cupons        enable row level security;

-- Produtos: qualquer um pode ler (loja pública)
create policy "produtos_publicos" on produtos
  for select using (ativo = true);

-- Produtos: só admin pode inserir/editar
create policy "produtos_admin_insert" on produtos
  for insert with check (
    exists (select 1 from usuarios where auth_id = auth.uid() and role = 'admin')
  );
create policy "produtos_admin_update" on produtos
  for update using (
    exists (select 1 from usuarios where auth_id = auth.uid() and role = 'admin')
  );

-- Categorias, tamanhos, acabamentos: leitura pública
create policy "categorias_publicas"   on categorias   for select using (true);
create policy "tamanhos_publicos"     on tamanhos     for select using (true);
create policy "acabamentos_publicos"  on acabamentos  for select using (true);

-- Pedidos: cliente vê apenas os seus
create policy "pedidos_dono" on pedidos
  for select using (
    usuario_id in (select id from usuarios where auth_id = auth.uid())
  );

-- Pedidos: cliente pode inserir (via Edge Function com service role)
create policy "pedidos_insert_service" on pedidos
  for insert with check (true); -- Edge Function usa service_role

-- Pedidos: admin vê todos
create policy "pedidos_admin" on pedidos
  for all using (
    exists (select 1 from usuarios where auth_id = auth.uid() and role = 'admin')
  );

-- Itens do pedido: mesmo dono do pedido
create policy "itens_dono" on pedido_itens
  for select using (
    pedido_id in (
      select p.id from pedidos p
      join usuarios u on u.id = p.usuario_id
      where u.auth_id = auth.uid()
    )
  );

-- Usuários: cada um vê só o próprio perfil
create policy "usuarios_proprio" on usuarios
  for select using (auth_id = auth.uid());

-- Usuários: admin vê todos
create policy "usuarios_admin" on usuarios
  for all using (
    exists (select 1 from usuarios where auth_id = auth.uid() and role = 'admin')
  );

-- Cupons: só admin gerencia
create policy "cupons_admin" on cupons
  for all using (
    exists (select 1 from usuarios where auth_id = auth.uid() and role = 'admin')
  );

-- ── TRIGGER: sincronizar auth.users → usuarios ───────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into usuarios (auth_id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── TRIGGER: updated_at automático ──────────────────────────────

create or replace function fn_update_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_pedidos_updated_at
  before update on pedidos
  for each row execute function fn_update_timestamp();

-- ── DADOS INICIAIS ───────────────────────────────────────────────

insert into categorias (nome, slug) values
  ('Natureza',    'natureza'),
  ('Abstrato',    'abstrato'),
  ('Urbano',      'urbano'),
  ('Minimalista', 'minimalista'),
  ('Retrô',       'retro'),
  ('Colorido',    'colorido')
on conflict (slug) do nothing;

insert into tamanhos (codigo, descricao, dimensoes, preco_extra) values
  ('p',  'Pequeno',  '20×30 cm', 0),
  ('m',  'Médio',    '30×40 cm', 30),
  ('g',  'Grande',   '40×60 cm', 60),
  ('gg', 'Extra Grande', '60×90 cm', 100)
on conflict (codigo) do nothing;

insert into acabamentos (codigo, nome, preco_extra) values
  ('sem',     'Quadro Normal',       0),
  ('borda',   'Com Borda',          20),
  ('vidro',   'Com Vidro',          40),
  ('bv',      'Borda + Vidro',      60),
  ('premium', 'Premium Completo',   90)
on conflict (codigo) do nothing;

-- ── CRIAR ADMIN (execute depois de criar a conta no Auth) ────────
-- 1. Crie a conta normal em Authentication → Users no painel do Supabase
-- 2. Depois rode isso substituindo o email:
-- update usuarios set role = 'admin' where email = 'seu@email.com';
