# univ

AI-powered college admission strategy dashboard for a Korean high school senior and family use.

This project helps track grades, evaluate admission chances with deterministic calculators, and support planning with RAG-based guidance.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Highlights

- Deterministic admission calculators (CSAT conversion, GPA conversion, risk banding).
- Family dashboard for records, signals, and admission schedules.
- RAG chatbot for brochure-based guidance with source grounding.

## Data Note

- This app consumes admission datasets prepared through the companion [`data-collector`](https://github.com/univ4/data-collector) pipeline.

## Tech Stack

- Next.js (App Router), TypeScript
- Supabase (PostgreSQL + pgvector + RLS)
- Claude 3.5 Sonnet + OpenAI embeddings
- Tailwind CSS + shadcn/ui

## Quick Start

```bash
git clone https://github.com/univ4/app.git
cd app
npm install
cp .env.local.example .env.local
npx supabase start
npx supabase db push
npm run dev
```

## Documentation (Korean)

For full product, architecture, API, schema, test specs, and user manual, see:

- [`docs/01_PRD_v2.md`](./docs/01_PRD_v2.md)
- [`docs/02_SYSTEM_ARCHITECTURE.md`](./docs/02_SYSTEM_ARCHITECTURE.md)
- [`docs/03_DATA_MODEL.md`](./docs/03_DATA_MODEL.md)
- [`docs/03_DB_SCHEMA.md`](./docs/03_DB_SCHEMA.md)
- [`docs/04_API_SPEC.md`](./docs/04_API_SPEC.md)
- [`docs/05_ROADMAP.md`](./docs/05_ROADMAP.md)
- [`docs/07_TEST_SPEC.md`](./docs/07_TEST_SPEC.md)
- [`docs/08_USER_MANUAL.md`](./docs/08_USER_MANUAL.md)

## Disclaimer

This tool is for decision support only and does not guarantee admission results.

## License

MIT

