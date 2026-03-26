# Деплой на Amvera

## 1. Подготовка репозитория

Убедитесь, что проект запушен в Git (GitHub, GitLab или репозиторий Amvera).

## 2. Создание приложения

1. Перейдите в [cloud.amvera.ru](https://cloud.amvera.ru/)
2. Нажмите «Создать проект» → выберите «Приложение»
3. Укажите название и тариф
4. Привяжите или создайте Git-репозиторий
5. Файл `amvera.yml` уже в корне проекта — Amvera подхватит его автоматически

## 3. Переменные окружения

В настройках приложения добавьте:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DB?schema=public` | Строка подключения PostgreSQL |
| `UPLOADS_DIR` | `/data/uploads` | Папка для скриншотов и изображений (должна быть в /data) |
| `NEXTAUTH_SECRET` | случайная строка | Сгенерируйте: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://ваш-проект.amvera.ru` | URL приложения после деплоя |
| `APP_URL` | `https://ваш-проект.amvera.ru` | Базовый URL для ссылок в email |
| `RESEND_API_KEY` | `re_...` | API ключ Resend для отправки email |
| `MAIL_FROM` | `no-reply@ваш-домен` | Отправитель писем (должен быть верифицирован в Resend) |

## 4. Первый деплой

1. После настройки нажмите «Завершить»
2. Amvera выполнит: `npm install` → `prisma generate` → `npm run build`
3. При запуске: `prisma db push --skip-generate` (создаст/обновит схему в PostgreSQL) → `npm start`
4. Папка `/data` нужна только для загрузок (`UPLOADS_DIR=/data/uploads`)

## 5. Обновление NEXTAUTH_URL

После первого деплоя скопируйте итоговый URL приложения и обновите `NEXTAUTH_URL` в переменных окружения.

## Порт

Приложение слушает порт 3000 (указано в `amvera.yml`). Amvera автоматически проксирует трафик на него.

**Важно:** в [документации Node Server](https://docs.amvera.ru/applications/environments/nodejs-server.html) у `containerPort` по умолчанию указан **80**. Если не задать `containerPort: 3000`, балансировщик будет стучаться не в тот порт — возможны 502 и перезапуски контейнера.

## Если в логах `SIGTERM` / `next start` обрывается

1. **Проверьте переменные:** `DATABASE_URL=postgresql://...`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. При ошибке подключения к PostgreSQL процесс может не дойти до прослушивания порта.
2. **Лог «Лог приложения»** в Amvera: успевает ли появиться строка вроде `Ready on` / `started server` до рестарта.
3. **Долгий старт:** `prisma db push` перед `npm run start` удлиняет старт. В `amvera.yml` используется `db push --skip-generate` (генерация уже в `build`). Если рестарты остаются — в настройках проекта можно добавить [Kubernetes startup/liveness probe](https://docs.amvera.ru/general/k8sprobe.html) с большим `initialDelaySeconds` (например 60–120).
4. **Мало RAM на тарифе** — OOM даёт внешнее завершение процесса; попробуйте повысить тариф или включить [standalone](https://nextjs.org/docs/app/api-reference/next-config-js/output)-сборку позже.

## Локальная разработка

Для локальной разработки используйте отдельный `DATABASE_URL` на локальный PostgreSQL и `UPLOADS_DIR=public/uploads`.
