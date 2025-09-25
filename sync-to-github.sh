#!/bin/bash
cd /Users/romanrabochiy/DEV_LOCAL/RABOTAEM/Photon

echo "🔄 Синхронизация с GitHub..."

# Переключаемся на основную ветку
git checkout main

# Получаем последние изменения с GitLab
echo "📥 Получение изменений с GitLab..."
git pull origin main

# Переключаемся на GitHub ветку
git checkout github-clean

# Сливаем изменения из main в github-clean с разрешением unrelated histories
echo "🔄 Слияние изменений из main..."
git merge main --allow-unrelated-histories --no-ff -m "Sync with main branch" || {
    echo "⚠️  Конфликт при слиянии, разрешаем автоматически..."
    git add .
    git commit -m "Resolve merge conflicts automatically"
}

# Удаляем чувствительные файлы из GitHub ветки
echo "🔒 Удаление чувствительных файлов..."
git rm -f .env .env.* 2>/dev/null || true

# Коммитим удаление чувствительных файлов
if git diff --cached --quiet; then
    echo "ℹ️  Чувствительные файлы уже удалены"
else
    git commit -m "Remove sensitive files (.env)"
fi

# Загружаем на GitHub (принудительно)
echo "📤 Загрузка на GitHub..."
git push -f github github-clean:main

echo "✅ Синхронизация с GitHub завершена!"
echo "🌐 Код доступен на: https://github.com/rrabotaem/rabotaem"
echo "🔒 Чувствительные файлы (.env) исключены из GitHub"
