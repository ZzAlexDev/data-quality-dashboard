# serializers.py
# Импортируем необходимый модуль из Django REST Framework
from rest_framework import serializers
# Импортируем наши модели, которые будем "переводить"
from .models import DataCheck, Report, Dataset  # Импортируем ВСЕ модели, которые используем!


class DataCheckSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели DataCheck.
    Задача: превратить объект DataCheck в JSON и обратно.
    """
    
    # Добавим дополнительное поле для красивого отображения типа проверки
    # source='get_check_type_display' - берёт человекочитаемое значение из модели
    check_type_display = serializers.CharField(
        source='get_check_type_display',
        read_only=True  # Это поле только для чтения в API
    )
    
    class Meta:
        model = DataCheck  # Говорим сериализатору: работаем с моделью DataCheck
        # Какие поля включаем в JSON:
        fields = ['id', 'check_type', 'check_type_display', 'result_json', 'created_at']
        # Какие поля только для чтения (нельзя менять через API):
        read_only_fields = ['id', 'created_at', 'check_type_display']

class ReportSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели Report.
    Отчёты в основном создаются автоматически, поэтому почти все поля только для чтения.
    """
    class Meta:
        model = Report  # Работаем с моделью Report
        fields = ['id', 'summary', 'issues_count', 'generated_at']
        # Почти все поля только для чтения - отчёт генерируется автоматически
        read_only_fields = ['id', 'issues_count', 'generated_at']
    
    # Можем добавить кастомное поле, если нужно
    def to_representation(self, instance):
        """
        Необязательный метод. Можно кастомизировать вывод JSON.
        По умолчанию и так работает хорошо, но оставим как пример.
        """
        data = super().to_representation(instance)
        # Добавим поле, если отчёт пустой
        if not data['summary']:
            data['summary'] = 'Отчёт ещё не сгенерирован'
        return data        
    
class DatasetSerializer(serializers.ModelSerializer):
    """
    Главный сериализатор для модели Dataset.
    Включает ВЛОЖЕННЫЕ данные: все проверки и отчёт.
    """
    
    # 1. Вложенные сериализаторы (САМОЕ ВАЖНОЕ!)
    checks = DataCheckSerializer(many=True, read_only=True)
    report = ReportSerializer(read_only=True)
    
    # 2. Кастомное поле для человекочитаемого статуса
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = Dataset
        fields = [
            'id',
            'name', 
            'csv_file',
            'uploaded_at',
            'status',
            'status_display',
            'checks',    # ← Автоматически включит все проверки
            'report',    # ← Автоматически включит отчёт
        ]
        read_only_fields = ['id', 'uploaded_at', 'checks', 'report', 'status_display']
    
    # 3. Валидация CSV файла
    def validate_csv_file(self, value):
        """Проверяем, что файл имеет расширение .csv"""
        import os
        if not value.name.lower().endswith('.csv'):
            raise serializers.ValidationError(
                'Поддерживаются только файлы с расширением .csv'
            )
        return value