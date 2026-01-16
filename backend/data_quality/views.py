"""
views.py - Views для API Data Quality Dashboard
"""

from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dataset, DataCheck, Report
from .serializers import DatasetSerializer, DataCheckSerializer, ReportSerializer

# ============================================================================
# 1. DATASET VIEWSET - ОСНОВНОЙ КОНТРОЛЛЕР
# ============================================================================
class DatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с датасетами.
    Предоставляет полный CRUD + кастомное действие analyze.
    """
    
    queryset = Dataset.objects.all().prefetch_related('checks')
    serializer_class = DatasetSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]  # Позже заменим на IsAuthenticated
    
    # ============================================================================
    # КАСТОМНОЕ ДЕЙСТВИЕ: АНАЛИЗ ДАТАСЕТА
    # ============================================================================
    @action(detail=True, methods=['post'], url_path='analyze')
    def analyze_dataset(self, request, pk=None):
        """
        Запускает РЕАЛЬНЫЙ анализ датасета с помощью pandas.
        Доступно по URL: POST /api/datasets/{id}/analyze/
        """
        # Получаем объект датасета
        dataset = self.get_object()
        
        print(f"🚀 Запускаем РЕАЛЬНЫЙ анализ датасета: {dataset.name}")
        
        try:
            # Импортируем анализатор (импортируем здесь чтобы избежать циклических импортов)
            from .analyzer import CSVAnalyzer
            
            # Запускаем реальный анализ
            analyzer = CSVAnalyzer(dataset)
            analyzer.analyze()
            
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
            
            print(f"❌ Ошибка при анализе: {str(e)}")
            
            return Response({
                'status': 'error',
                'message': f'Ошибка при анализе: {str(e)}',
                'dataset_id': dataset.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 2. FILE UPLOAD VIEW - ПРОСТОЙ ВЬЮ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ
# ============================================================================
class FileUploadView(APIView):
    """
    Простой API endpoint только для загрузки CSV файлов.
    Доступно по URL: POST /api/upload/
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
# 3. ДОПОЛНИТЕЛЬНЫЕ VIEWSET ДЛЯ ПРОВЕРОК И ОТЧЁТОВ
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