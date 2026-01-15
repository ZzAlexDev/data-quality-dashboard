# Импортируем стандартный модуль админки Django
from django.contrib import admin

# Импортируем наши модели, которые будем регистрировать
from .models import Dataset, DataCheck, Report

# --- НАСТРОЙКА ДЛЯ МОДЕЛИ DataCheck (Проверка) ---
# Класс для "встроенного" отображения проверок внутри страницы датасета
class DataCheckInline(admin.TabularInline):
    """
    TabularInline позволяет отображать связанные объекты DataCheck
    прямо на странице редактирования родительского Dataset.
    Это даёт наглядную картину: один датасет -> много проверок.
    """
    # Указываем модель, с которой работает этот inline
    model = DataCheck
    # Дополнительные пустые строки для быстрого добавления новых проверок
    extra = 1
    # Поля, доступные только для чтения (чтобы не редактировать их тут)
    readonly_fields = ['created_at']
    # Какие поля отображать в таблице
    fields = ['check_type', 'result_json', 'created_at']


# --- НАСТРОЙКА ДЛЯ МОДЕЛИ Dataset (Датасет) ---
# Декоратор @admin.register() заменяет старый метод admin.site.register()
# Он связывает модель Dataset с классом-настройщиком DatasetAdmin
@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    """
    Основной класс для настройки отображения модели Dataset в админке.
    Здесь определяем, КАК будет выглядеть список датасетов и форма редактирования.
    """

    # 1. КАКИЕ ПОЛЯ ПОКАЗЫВАТЬ В СПИСКЕ ВСЕХ ДАТАСЕТОВ
    list_display = ['id', 'name', 'uploaded_at', 'status', 'report_summary']
    # 'id', 'name'... - стандартные поля
    # 'report_summary' - КАСТОМНОЕ ПОЛЕ (метод определим ниже)

    # Добавить в класс DatasetAdmin где-то после list_display:
    readonly_fields = ['uploaded_at']

    # 2. КЛИКАБЕЛЬНЫЕ ПОЛЯ В СПИСКЕ (по ним можно перейти к редактированию)
    list_display_links = ['id', 'name']

    # 3. ФИЛЬТРЫ СБОКУ (позволяют быстро отфильтровать список по статусу или дате)
    list_filter = ['status', 'uploaded_at']

    # 4. ПОИСК ПО ПОЛЯМ (поисковая строка сверху)
    search_fields = ['name']

    # 5. ДАТА-НАВИГАТОР (удобный виджет для фильтрации по дате загрузки)
    date_hierarchy = 'uploaded_at'

    # 6. ДЕЙСТВИЯ С ВЫДЕЛЕННЫМИ ОБЪЕКТАМИ (выпадающий список "Действие")
    # Пока используем стандартные. Позже можно добавить свои, например, "запустить проверку".
    actions = ['delete_selected']

    # 7. ВСТРОЕННЫЕ ОБЪЕКТЫ (показываем связанные проверки DataCheck на той же странице)
    inlines = [DataCheckInline]

    # 8. ПОРЯДОК И ГРУППИРОВКА ПОЛЕЙ НА СТРАНИЦЕ РЕДАКТИРОВАНИЯ
    fieldsets = (
        # Первая группа полей: "Основная информация"
        ('Основная информация', {
            'fields': ('name', 'csv_file', 'status'),
            'description': 'Базовая информация о загруженном файле'
        }),
        # Вторая группа: "Системная информация" (только для чтения)
        ('Системная информация', {
            'fields': ('uploaded_at',),
            'classes': ('collapse',),  # Группа свёрнута по умолчанию
            'description': 'Эти поля заполняются автоматически'
        }),
    )

    # 9. КАСТОМНЫЙ МЕТОД для list_display (тот самый 'report_summary')
    def report_summary(self, obj):
        """
        Возвращает краткую сводку из связанного отчёта для отображения в списке.
        obj - это экземпляр модели Dataset.
        """
        # Проверяем, есть ли у этого датасета связанный отчёт
        if hasattr(obj, 'report') and obj.report:
            # Обрезаем текст, если он слишком длинный
            summary = obj.report.summary
            if len(summary) > 50:
                return summary[:50] + '...'
            return summary
        return '— отчёт отсутствует —'
    # Задаём человекочитаемое название для колонки в списке
    report_summary.short_description = 'Краткая сводка'


# --- НАСТРОЙКА ДЛЯ МОДЕЛИ Report (Отчёт) ---
@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """
    Класс для настройки отображения отчётов.
    Отчёты в основном создаются автоматически, поэтому делаем их readonly.
    """

    # 1. ПОЛЯ В СПИСКЕ
    list_display = ['dataset', 'issues_count', 'generated_at', 'short_summary']

    # 2. ССЫЛКА НА ДАТАСЕТ КАК КЛИКАБЕЛЬНОЕ ПОЛЕ
    list_display_links = ['dataset']

    # 3. ПОЧТИ ВСЕ ПОЛЯ ТОЛЬКО ДЛЯ ЧТЕНИЯ (редактировать вручную не нужно)
    readonly_fields = ['dataset', 'issues_count', 'generated_at']

    # 4. ГРУППИРОВКА ПОЛЕЙ НА СТРАНИЦЕ ДЕТАЛЕЙ
    fieldsets = (
        ('Связь с данными', {
            'fields': ('dataset', 'issues_count')
        }),
        ('Содержание отчёта', {
            'fields': ('summary',)
        }),
        ('Метаданные', {
            'fields': ('generated_at',),
            'classes': ('collapse',)
        }),
    )

    # 5. КАСТОМНЫЙ МЕТОД ДЛЯ КОРОТКОГО ОПИСАНИЯ
    def short_summary(self, obj):
        if obj.summary and len(obj.summary) > 70:
            return obj.summary[:70] + '...'
        return obj.summary or '—'
    short_summary.short_description = 'Сводка'


# --- НАСТРОЙКА ДЛЯ МОДЕЛИ DataCheck (как отдельной страницы) ---
@admin.register(DataCheck)
class DataCheckAdmin(admin.ModelAdmin):
    """
    Класс для просмотра отдельных проверок.
    """

    # Показываем связь с датасетом, тип проверки и дату
    list_display = ['dataset', 'check_type', 'created_at']
    # Фильтруем по типу проверки и дате создания
    list_filter = ['check_type', 'created_at']
    # Поля только для чтения (проверки создаются автоматически)
    readonly_fields = ['dataset', 'check_type', 'result_json', 'created_at']

    # Группировка полей
    fieldsets = (
        ('Связь', {
            'fields': ('dataset', 'check_type')
        }),
        ('Результат', {
            'fields': ('result_json',)
        }),
        ('Метаданные', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )