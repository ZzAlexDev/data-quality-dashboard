# Импортируем необходимые модули Django и DRF
from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

# Импортируем наши модели и сериализаторы
from .models import Dataset, DataCheck, Report
from .serializers import DatasetSerializer, DataCheckSerializer, ReportSerializer

# ============================================================================
# 1. DATASET VIEWSET - ОСНОВНОЙ КОНТРОЛЛЕР ДЛЯ РАБОТЫ С ДАТАСЕТАМИ
# ============================================================================
class DatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet для полного CRUD датасетов.
    Автоматически предоставляет:
    - GET    /api/datasets/           - список всех датасетов
    - POST   /api/datasets/           - создание нового датасета
    - GET    /api/datasets/{id}/      - получение конкретного датасета
    - PUT    /api/datasets/{id}/      - полное обновление датасета
    - PATCH  /api/datasets/{id}/      - частичное обновление датасета
    - DELETE /api/datasets/{id}/      - удаление датасета
    """
    
    # 1.1. Какие данные будем обрабатывать
    queryset = Dataset.objects.all().prefetch_related('checks')
    # prefetch_related оптимизирует запросы к связанным проверкам
    
    # 1.2. Какой сериализатор использовать
    serializer_class = DatasetSerializer
    
    # 1.3. Какие парсеры разрешены (для загрузки файлов)
    parser_classes = [MultiPartParser, FormParser]
    
    # 1.4. Права доступа (пока разрешаем всё)
    permission_classes = [permissions.AllowAny]
    
    # ============================================================================
    # КАСТОМНОЕ ДЕЙСТВИЕ: АНАЛИЗ ДАТАСЕТА
    # ============================================================================
    @action(detail=True, methods=['post'], url_path='analyze')
    def analyze_dataset(self, request, pk=None):
        """
        Запускает анализ конкретного датасета.
        Доступно по URL: POST /api/datasets/{id}/analyze/
        """
        # Получаем объект датасета по ID из URL
        dataset = self.get_object()
        
        print(f"🚀 Запускаем анализ датасета: {dataset.name}")
        
        # Здесь будет реальная логика анализа с pandas
        # Пока имитируем успешный анализ
        try:
            # ИМИТАЦИЯ АНАЛИЗА (позже заменим на реальный код с pandas)
            self._simulate_analysis(dataset)
            
            # Обновляем статус датасета
            dataset.status = 'completed'
            dataset.save()
            
            # Возвращаем успешный ответ
            return Response({
                'status': 'success',
                'message': f'Анализ датасета "{dataset.name}" завершён',
                'dataset_id': dataset.id,
                'view_url': f'/admin/data_quality/dataset/{dataset.id}/change/'
            })
            
        except Exception as e:
            # В случае ошибки
            dataset.status = 'failed'
            dataset.save()
            
            return Response({
                'status': 'error',
                'message': f'Ошибка при анализе: {str(e)}',
                'dataset_id': dataset.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # ============================================================================
    # ПРИВАТНЫЙ МЕТОД ДЛЯ ИМИТАЦИИ АНАЛИЗА (ВРЕМЕННЫЙ)
    # ============================================================================
    def _simulate_analysis(self, dataset):
        """
        Временный метод для имитации анализа.
        Позже заменим на реальную логику с pandas.
        """
        # Создаём тестовые проверки
        DataCheck.objects.create(
            dataset=dataset,
            check_type='missing',
            result_json={
                'total_rows': 100,
                'missing_cells': 5,
                'missing_percentage': 5.0,
                'columns_with_missing': {'email': 3, 'phone': 2}
            }
        )
        
        DataCheck.objects.create(
            dataset=dataset,
            check_type='duplicates',
            result_json={
                'total_rows': 100,
                'duplicate_rows': 2,
                'duplicate_percentage': 2.0
            }
        )
        
        DataCheck.objects.create(
            dataset=dataset,
            check_type='statistics',
            result_json={
                'numeric_columns': {
                    'age': {'min': 18, 'max': 65, 'mean': 32.5, 'std': 12.1}
                },
                'text_columns': {
                    'name': {'unique_values': 95, 'most_common': 'Иван'}
                }
            }
        )
        
        # Создаём сводный отчёт
        Report.objects.create(
            dataset=dataset,
            summary='Найдено 7 проблем: 5 пропущенных значений и 2 дубликата. Требуется очистка данных.',
            issues_count=7
        )
        
        print(f"✅ Имитация анализа завершена для {dataset.name}")


# ============================================================================
# 2. FILE UPLOAD VIEW - ПРОСТОЙ ВЬЮ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ
# ============================================================================
class FileUploadView(APIView):
    """
    Простой API endpoint только для загрузки CSV файлов.
    Доступно по URL: POST /api/upload/
    
    Альтернатива DatasetViewSet.create() - проще для понимания.
    """
    
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, format=None):
        """
        Обрабатывает POST запрос с файлом.
        """
        print("📥 Получен запрос на загрузку файла")
        
        # 1. Получаем файл из запроса
        csv_file = request.FILES.get('file')
        
        # 2. Проверяем, что файл есть
        if not csv_file:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Проверяем расширение
        if not csv_file.name.lower().endswith('.csv'):
            return Response(
                {'error': 'Поддерживаются только CSV файлы (.csv)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 4. Создаём запись в базе
        try:
            dataset = Dataset.objects.create(
                name=csv_file.name,
                csv_file=csv_file,
                status='uploaded'
            )
            
            print(f"✅ Файл сохранён: {csv_file.name} -> ID: {dataset.id}")
            
            # 5. Сериализуем данные для ответа
            serializer = DatasetSerializer(dataset)
            
            return Response(
                {
                    'status': 'success',
                    'message': 'Файл успешно загружен',
                    'data': serializer.data,
                    'actions': {
                        'analyze': f'/api/datasets/{dataset.id}/analyze/',
                        'view': f'/api/datasets/{dataset.id}/',
                        'admin': f'/admin/data_quality/dataset/{dataset.id}/change/'
                    }
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            print(f"❌ Ошибка при сохранении файла: {str(e)}")
            return Response(
                {'error': f'Ошибка при сохранении файла: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# 3. ДОПОЛНИТЕЛЬНЫЕ VIEWSET ДЛЯ ПРОВЕРОК И ОТЧЁТОВ (ОПЦИОНАЛЬНО)
# ============================================================================
class DataCheckViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet только для чтения проверок.
    Полезно для отладки.
    """
    queryset = DataCheck.objects.all()
    serializer_class = DataCheckSerializer


class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet только для чтения отчётов.
    """
    queryset = Report.objects.all()
    serializer_class = ReportSerializer