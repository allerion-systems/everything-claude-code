# Allerion LLC — Website

A premium marketing landing page for **Allerion LLC**, built with Next.js (App
Router) and TypeScript. The design matches the brand: a deep navy palette and the
monolithic triangular "A" mark. The page invites visitors to *connect into their
next trip* with a working contact form.

## Sections

- **Hero** — headline + "Plan your trip" call-to-action
- **Services** — trip planning, booking & logistics, concierge support
- **How it works** — three-step process
- **Contact** — trip-planning enquiry form (`POST /api/contact`)

## Getting started

```bash
cd allerion-website
npm install
npm run dev
```

Then open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Wiring up the contact form

`app/api/contact/route.ts` validates submissions and currently logs them to the
server console. To deliver leads for real, plug in your provider of choice
(e.g. Resend / SendGrid for email, or Supabase / a database) where the `TODO`
comment is.

## Project structure

```
allerion-website/
├── app/
│   ├── api/contact/route.ts   # contact form endpoint
│   ├── globals.css            # brand styling
│   ├── layout.tsx             # root layout + metadata
│   └── page.tsx               # landing page
├── components/
│   ├── ContactForm.tsx        # client-side form with status states
│   └── Logo.tsx               # SVG triangular "A" mark + wordmark
└── package.json
```
