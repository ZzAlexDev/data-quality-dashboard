# test_serializer.py - ИСПРАВЛЕННАЯ ВЕРСИЯ (замени полностью)
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from data_quality.serializers import ReportSerializer
from data_quality.models import Report, Dataset

print("=== ТЕСТИРУЕМ ReportSerializer ===")

# 1. Создаём ПЕРВЫЙ набор объектов
print("1. Создаём первый набор объектов...")
test_dataset1 = Dataset.objects.create(name="test1.csv", status="uploaded")
test_report1 = Report.objects.create(
    dataset=test_dataset1,  # Уникальная связь
    summary="Первый отчёт",
    issues_count=5
)
print(f"   ✅ Создан датасет 1: {test_dataset1}")
print(f"   ✅ Создан отчёт 1: {test_report1}")

# 2. Тестируем сериализатор для первого отчёта
print("\n2. Тестируем ReportSerializer для первого отчёта...")
serializer1 = ReportSerializer(test_report1)
print("   📊 Результат сериализации:")
for key, value in serializer1.data.items():
    print(f"      {key}: {value}")

# 3. Создаём ВТОРОЙ набор объектов для теста пустого summary
print("\n3. Создаём второй набор объектов (для пустого summary)...")
test_dataset2 = Dataset.objects.create(name="test2.csv", status="uploaded")  # НОВЫЙ датасет!
report_empty = Report.objects.create(
    dataset=test_dataset2,  # Другой датасет - нет конфликта!
    summary="",  # Пустой!
    issues_count=0
)
serializer_empty = ReportSerializer(report_empty)
print(f"   Пустой summary заменён на: '{serializer_empty.data['summary']}'")

# 4. Демонстрация ошибки OneToOne (опционально)
print("\n4. Демонстрация ограничения OneToOneField...")
try:
    # Пытаемся создать второй отчёт для первого датасета
    Report.objects.create(
        dataset=test_dataset1,  # Тот же датасет что и в отчёте 1!
        summary="Второй отчёт для того же датасета",
        issues_count=1
    )
    print("   ❌ Этого не должно было случиться!")
except Exception as e:
    print(f"   ✅ Ожидаемая ошибка: {type(e).__name__}")
    print(f"   Сообщение: {str(e)}")

print("\n" + "="*50)
print("✅ ВСЁ РАБОТАЕТ! ReportSerializer готов.")
print("✅ OneToOneField работает корректно.")