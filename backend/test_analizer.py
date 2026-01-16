#!/usr/bin/env python
"""
test_analyzer.py - Тестирование анализатора CSV
"""

import os
import sys
import django

# 1. Добавляем текущую папку в путь Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 2. Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# 3. Инициализируем Django
django.setup()

# ТОЛЬКО ПОСЛЕ ЭТОГО импортируем модели
from data_quality.models import Dataset
from data_quality.analyzer import CSVAnalyzer

def main():
    """Основная функция тестирования."""
    print("🧪 ТЕСТИРУЕМ АНАЛИЗАТОР CSV")
    print("=" * 50)
    
    # Получаем последний датасет
    try:
        dataset = Dataset.objects.last()
        if not dataset:
            print("❌ Нет датасетов в базе. Сначала загрузи файл через API.")
            return
        
        print(f"📁 Датасет: {dataset.name} (ID: {dataset.id})")
        print(f"📂 Файл: {dataset.csv_file.path}")
        print(f"📊 Статус: {dataset.get_status_display()}")
        print("-" * 50)
        
        # Проверяем существование файла
        if not os.path.exists(dataset.csv_file.path):
            print(f"❌ Файл не найден: {dataset.csv_file.path}")
            print("   Проверь, что файл загружен через Django (в папке media/)")
            return
        
        print(f"✅ Файл существует: {os.path.getsize(dataset.csv_file.path)} байт")
        
        # Тестируем анализатор
        print("\n🔍 Запускаем анализатор...")
        try:
            analyzer = CSVAnalyzer(dataset)
            analyzer.analyze()
            print("\n✅ Анализатор работает корректно!")
            
            # Проверяем результаты
            print("\n📊 Результаты в базе:")
            checks = dataset.checks.all()
            for check in checks:
                print(f"   - {check.get_check_type_display()}: {check.result_json}")
            
            if dataset.report:
                print(f"\n📄 Отчёт: {dataset.report.summary[:100]}...")
            
        except Exception as e:
            print(f"\n❌ Ошибка в анализаторе: {type(e).__name__}")
            print(f"   Сообщение: {str(e)}")
            print("\n🔧 Отладка:")
            print(f"   Тип датасета: {type(dataset)}")
            print(f"   Атрибут csv_file: {dataset.csv_file}")
            print(f"   Путь к файлу: {getattr(dataset.csv_file, 'path', 'нет атрибута path')}")
    
    except Exception as e:
        print(f"\n❌ Общая ошибка: {type(e).__name__}")
        print(f"   Сообщение: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()