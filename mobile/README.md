# Cicclo Mobile

Expo app for viewing the wallet balance, adding simulated wallet credits,
browsing active services, and placing idempotent service requests. Simulated
credits update the API balance immediately and do not process real payments.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` to an API address reachable from the simulator or device.
3. Run `npm install` and then `npm run start`.

Use `npm run android`, `npm run ios`, or `npm run web` to start on a specific
platform. A physical device must use the computer's LAN address rather than
`localhost`.

The API allows CORS only for the Expo web preview origins
`http://localhost:8081` and `http://127.0.0.1:8081` in every environment.
Restart the API after changing its configuration.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test`
