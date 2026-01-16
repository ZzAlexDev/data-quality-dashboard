# data_quality/urls.py

# Импортируем необходимые модули
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Импортируем наши View (обработчики запросов)
from .views import (
    DatasetViewSet,      # Основной ViewSet для датасетов
    FileUploadView,      # Простой View для загрузки файлов
    DataCheckViewSet,    # ViewSet для проверок (только чтение)
    ReportViewSet        # ViewSet для отчётов (только чтение)
)

# ============================================================================
# 1. СОЗДАЁМ ROUTER - АВТОМАТИЧЕСКИЙ ГЕНЕРАТОР URL
# ============================================================================
router = DefaultRouter()

# Регистрируем ViewSet'ы в роутере
# Каждая строка ниже создаёт НАБОР URL-адресов автоматически

router.register(r'datasets', DatasetViewSet, basename='dataset')
# Эта одна строка создаст:
# - GET    /datasets/          - список всех датасетов
# - POST   /datasets/          - создание нового датасета  
# - GET    /datasets/{id}/     - получение конкретного датасета
# - PUT    /datasets/{id}/     - полное обновление датасета
# - PATCH  /datasets/{id}/     - частичное обновление датасета
# - DELETE /datasets/{id}/     - удаление датасета
# - POST   /datasets/{id}/analyze/ - наше кастомное действие!

router.register(r'checks', DataCheckViewSet, basename='datacheck')
# Создаст только для чтения:
# - GET    /checks/            - список всех проверок
# - GET    /checks/{id}/       - конкретная проверка

router.register(r'reports', ReportViewSet, basename='report')
# Аналогично для отчётов

# ============================================================================
# 2. ОПРЕДЕЛЯЕМ URLPATTERNS - КОНКРЕТНЫЕ ПУТИ ДОСТУПА
# ============================================================================
urlpatterns = [
    # Включаем ВСЕ маршруты из роутера
    # Префикс '' означает, что они будут доступны прямо от корня /api/
    path('', include(router.urls)),
    
    # Отдельный маршрут для загрузки файлов
    # Будет доступен по /api/upload/
    path('upload/', FileUploadView.as_view(), name='file-upload'),
]

# ============================================================================
# 3. КОММЕНТАРИЙ ДЛЯ ПОНИМАНИЯ СТРУКТУРЫ URL
# ============================================================================
"""
ИТОГОВАЯ СТРУКТУРА API:

ГЛАВНЫЙ ПРЕФИКС (в config/urls.py): /api/
  ├── /datasets/                    ← DatasetViewSet (CRUD + analyze)
  │     ├── GET, POST /             (список/создание)
  │     ├── GET, PUT, PATCH, DELETE /{id}/ (конкретный датасет)
  │     └── POST /{id}/analyze/     (запуск анализа)
  ├── /upload/                      ← FileUploadView (только POST)
  ├── /checks/                      ← DataCheckViewSet (только GET)
  └── /reports/                     ← ReportViewSet (только GET)
"""