# Nandy Govi — Versão Supabase-Only

Stack: React + Vite (Vercel) + Supabase (banco + auth + edge functions)
Custo: R$0/mês

---

## Deploy em 4 passos

### 1. Supabase

1. Crie projeto em supabase.com
2. Vá em **SQL Editor** e cole o conteúdo de `supabase_schema.sql`
3. Execute tudo

### 2. Criar conta admin

1. Supabase → **Authentication** → **Users** → "Invite user" com seu e-mail
2. Crie a senha quando receber o e-mail
3. No **SQL Editor**, rode:
   ```sql
   update usuarios set role = 'admin' where email = 'seu@email.com';
   ```

### 3. Edge Functions

```bash
# Instale a CLI do Supabase
npm install -g supabase

# Login
supabase login

# Link ao seu projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy da função
supabase functions deploy criar-pedido

# Adicione as variáveis de ambiente na função
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

### 4. Vercel (frontend)

1. Import o repositório
2. Root directory: `frontend`
3. Framework: Vite
4. Variáveis de ambiente:
   ```
   VITE_SUPABASE_URL     = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...
   ```
5. Deploy!

---

## Adicionar produto (Admin)

1. Acesse `seusite.com/ng-painel`
2. Login com sua conta admin
3. Produtos → Novo produto

## Integrar Mercado Pago (depois)

Edite `supabase/functions/criar-pedido/index.ts`:
1. Substitua o bloco "Pix simulado" pela chamada à API do MP
2. `supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxx`
3. `supabase functions deploy criar-pedido`

---

## Variáveis necessárias

| Variável | Onde pegar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY` | resend.com (gratuito: 100 emails/dia) |
| `MP_ACCESS_TOKEN` | mercadopago.com/developers (opcional) |
