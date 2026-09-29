# Chocolícia

Site institucional da confeitaria **Chocolícia** — doces artesanais, bolos personalizados, buffet e formulário de orçamento.

**Produção:** [chocolicia.site](https://chocolicia.site)

## Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Wouter
- **Backend:** Express, tRPC
- **Banco:** PostgreSQL (Neon) com Drizzle ORM
- **Armazenamento:** Neon Object Storage (S3-compatible) para galeria dinâmica
- **Deploy:** Vercel (frontend estático + API serverless)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+

## Rodar localmente

```bash
pnpm install
cp .env.example .env   # Windows: copy .env.example .env
# Preencha .env com suas credenciais (veja abaixo)
pnpm dev
```

Abra **http://localhost:3000/** (ou a porta exibida no terminal se a 3000 estiver ocupada).

### Scripts úteis

| Comando        | Descrição                          |
|----------------|------------------------------------|
| `pnpm dev`     | Servidor de desenvolvimento        |
| `pnpm build`   | Build do client + bundle do server |
| `pnpm start`   | Produção local (após `pnpm build`) |
| `pnpm test`    | Testes unitários                   |
| `pnpm check`   | Verificação TypeScript             |
| `pnpm db:push` | Migrações Drizzle (requer Neon)    |

## Variáveis de ambiente

Copie `.env.example` para `.env` e configure:

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `DATABASE_URL` ou `NEON_DATABASE_URL` | Sim (orçamentos e catálogo) | Conexão PostgreSQL |
| `JWT_SECRET` | Sim (login admin) | Assinatura do cookie de sessão |
| `ADMIN_PASSWORD` | Sim (área do catálogo) | Senha da responsável |
| `ADMIN_OPEN_ID` | Não | ID do usuário admin (padrão: `chocolicia-admin`) |
| `AWS_ACCESS_KEY_ID` | Para upload na galeria | Neon Object Storage |
| `AWS_SECRET_ACCESS_KEY` | Para upload na galeria | Neon Object Storage |
| `AWS_ENDPOINT_URL_S3` | Para upload na galeria | Endpoint S3 da Neon |
| `AWS_REGION` | Não | Região (padrão `us-east-2`) |
| `S3_BUCKET_NAME` | Não | Bucket (padrão `assets`) |
| `PORT` | Não | Porta do servidor (padrão `3000`) |

Sem `ADMIN_PASSWORD` ou `JWT_SECRET`, o login administrativo **não** funciona (comportamento intencional).

## Deploy na Vercel

1. Importe o repositório [AdminFreitas/chocolicia](https://github.com/AdminFreitas/chocolicia) na Vercel.
2. Framework preset: **Other** (o `vercel.json` já define build e rewrites).
3. Cadastre as variáveis de ambiente listadas acima em **Project → Settings → Environment Variables**.
4. Conecte o banco Neon (integração Vercel + Neon ou `DATABASE_URL` manual).
5. Após o deploy, aponte o domínio **chocolicia.site** (e `www`) em **Domains**.

A API (`/api/trpc`, `/api/auth/login`) roda via `api/index.ts`; o site estático sai de `dist/public`.

## Licença

MIT
