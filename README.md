# FreshCart

FreshCart is an e-commerce application built with React, TypeScript, and Vite.
The current foundation includes shared layout components, page-route
placeholders, verified API types, and a centralized Fetch API client.

## Development

```sh
npm install
npm run dev
```

## Validation

```sh
npm run lint
npm run build
```

## Structure

- `src/components/common` — reusable loading and error states
- `src/components/layout` — navigation, footer, and main page layout
- `src/pages` — page placeholders and not-found page
- `src/services/api.ts` — Fetch API client
- `src/types` — API envelopes and verified entity types
- `src/App.tsx` — application route definitions

## API

The client uses `https://ecommerce.routemisr.com/api/v1`. It supports JSON
request bodies, `FormData`, query parameters, custom headers, and an optional
custom `token` header. It does not assume Bearer authentication. Authentication
and data-changing features are not implemented yet.

Keyword search was accepted by the API but did not return results during
verification, including for terms taken from live product titles. Treat search
behavior as unverified until tested again.
