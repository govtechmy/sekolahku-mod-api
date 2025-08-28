# sekolahku-mod-api

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Docker

Build the image:

```bash
docker build -t sekolahku-mod-api .
```

Run (local/dev):

```bash
docker run --rm -p 3000:3000 \
  -e APP_ENV=development \
  -e PORT=3000 \
  -e MONGODB_URI="mongodb://localhost:27017/sekolahku" \
  -e JWT_SECRET="dev_jwt_secret" \
  -e REFRESH_TOKEN_SECRET="dev_refresh_secret" \
  sekolahku-mod-api
```

Run (production):

```bash
docker run --rm -p 3000:3000 \
  -e APP_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI="your_prod_mongodb_uri" \
  -e JWT_SECRET="your_prod_jwt_secret" \
  -e REFRESH_TOKEN_SECRET="your_prod_refresh_secret" \
  -e FRONTEND_ORIGIN="https://your-frontend.example.com" \
  sekolahku-mod-api
```

Notes:
- The server listens on `0.0.0.0` and uses `PORT` (default `3000`).
- `FRONTEND_ORIGIN` is required when `APP_ENV=production`.
