# config/urls.py (стало)
from django.contrib import admin
from django.urls import path, include  # ← ДОБАВИЛИ include!
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('data_quality.urls')),  # ← ВСЁ НАШЕ API!
]

# Это нужно для работы с загруженными файлами в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)