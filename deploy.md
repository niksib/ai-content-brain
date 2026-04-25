# 1. Подключиться к серверу
gcloud compute ssh instance-20251230-192400 --zone=us-central1-c --tunnel-through-iap

# 2. Перейти в папку проекта
cd /var/www/ai-content-brain

# 3. Подтянуть изменения
sudo git pull origin main

# 4. Пересобрать и перезапустить контейнеры
sudo docker compose -p ai-content-brain -f docker/prod/docker-compose.yml \
--env-file docker/prod/.env \
up -d --build backend frontend

# 5. Запустить миграции (если были изменения в schema.prisma)
sudo docker exec ai-content-brain-backend-1 npx prisma migrate deploy

# 6. Почистить старые образы (освободить диск)
sudo docker image prune -f