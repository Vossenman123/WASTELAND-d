# GymLog – Laravel Backend

REST API powering the GymLog PWA with real user authentication (email + password via [Laravel Sanctum](https://laravel.com/docs/sanctum)).

## Requirements

| Requirement | Version |
|---|---|
| PHP | ≥ 8.3 |
| Composer | ≥ 2 |
| Database | SQLite (zero config) **or** MySQL / MariaDB / PostgreSQL |

## Quick start (local / development)

```bash
# 1. Clone and enter the backend directory
git clone … && cd WASTELAND-d/backend

# 2. Install PHP dependencies
composer install

# 3. Copy environment file and generate app key
cp .env.example .env
php artisan key:generate

# 4. (Optional) Switch to MySQL – edit DB_* variables in .env then:
# php artisan migrate --seed

# 5. Run migrations (SQLite is created automatically)
php artisan migrate

# 6. Start the development server
php artisan serve          # http://127.0.0.1:8000
```

The API is now available at **http://127.0.0.1:8000/api**.

## Connecting the frontend

Open `api.js` in the project root and set:

```js
const API_CONFIG = {
  useBackend: true,
  baseUrl: 'http://127.0.0.1:8000/api',
  token: null,          // filled automatically after login
};
```

The frontend login/register screens will call the backend and store the token automatically.

## API reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/register | – | Register (name, email, password, password_confirmation) |
| POST | /api/login | – | Login → returns token |
| POST | /api/logout | ✓ | Revoke current token |
| GET  | /api/me | ✓ | Current user |
| GET/POST/PUT/DELETE | /api/exercises | ✓ | Exercise CRUD |
| GET/POST/DELETE | /api/workouts | ✓ | Workout CRUD |
| GET/POST/PUT/DELETE | /api/templates | ✓ | Template CRUD |
| GET  | /api/prs | ✓ | Computed personal records |
| GET/PUT | /api/settings | ✓ | User preferences |
| GET/POST/DELETE | /api/friends | ✓ | Friends |

All authenticated endpoints require `Authorization: Bearer <token>` header.

## Production deployment

1. Set `APP_ENV=production`, `APP_DEBUG=false`, generate a real `APP_KEY`
2. Use MySQL/MariaDB instead of SQLite
3. Point a web server (Nginx/Apache) at the `public/` directory
4. Run `php artisan config:cache && php artisan route:cache`
5. Set `SANCTUM_STATEFUL_DOMAINS` to your frontend domain if using cookie auth
