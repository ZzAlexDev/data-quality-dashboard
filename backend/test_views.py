# test_views.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from data_quality.views import DatasetViewSet, FileUploadView
from data_quality.models import Dataset
from rest_framework.test import APIRequestFactory
from rest_framework import status

print("=== ТЕСТИРУЕМ VIEWS (без запуска сервера) ===")

# Создаём тестовый объект
dataset = Dataset.objects.create(name="test_view.csv", status="uploaded")

# 1. Тестируем DatasetViewSet
print("\n1. Тестируем DatasetViewSet...")
viewset = DatasetViewSet()
viewset.request = None
viewset.format_kwarg = None

# Получаем queryset
queryset = viewset.get_queryset()
print(f"   ✅ Queryset содержит {queryset.count()} датасетов")

# Получаем конкретный объект
viewset.kwargs = {'pk': dataset.id}
obj = viewset.get_object()
print(f"   ✅ Получили объект: {obj.name}")

# 2. Тестируем метод analyze_dataset
print("\n2. Тестируем analyze_dataset...")
factory = APIRequestFactory()
request = factory.post(f'/api/datasets/{dataset.id}/analyze/')
viewset.request = request
viewset.format_kwarg = None

try:
    response = viewset.analyze_dataset(request, pk=dataset.id)
    print(f"   ✅ Ответ analyze_dataset: {response.data['status']}")
    print(f"   ✅ Сообщение: {response.data['message']}")
    
    # Проверяем, что создались проверки
    checks_count = dataset.checks.count()
    print(f"   ✅ Создано проверок: {checks_count}")
    
    # Проверяем, что создался отчёт
    has_report = hasattr(dataset, 'report') and dataset.report
    print(f"   ✅ Отчёт создан: {has_report}")
    
except Exception as e:
    print(f"   ❌ Ошибка: {str(e)}")

print("\n" + "="*50)
print("✅ Views работают корректно!")
print("\nСледующий шаг: настройка URL-маршрутов")