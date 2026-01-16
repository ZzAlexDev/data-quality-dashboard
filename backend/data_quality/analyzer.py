"""
analyzer.py - Реальный анализатор CSV файлов с pandas
"""

import pandas as pd
import numpy as np
from django.core.files.storage import default_storage

class CSVAnalyzer:
    """
    Класс для анализа CSV файлов.
    Заменяет старую имитацию _simulate_analysis.
    """
    
    def __init__(self, dataset):
        """
        Инициализация анализатора.
        
        Args:
            dataset: Объект модели Dataset
        """
        self.dataset = dataset
        self.file_path = dataset.csv_file.path
        self.df = None
        
    def analyze(self):
        """
        Основной метод анализа.
        
        Returns:
            bool: True если анализ успешен
        """
        print(f"🔍 Начинаем анализ файла: {self.file_path}")
        
        try:
            # 1. Загружаем CSV
            self._load_csv()
            
            if self.df is None:
                raise ValueError("Не удалось загрузить CSV файл")
            
            # 2. Выполняем проверки
            missing_results = self._check_missing_values()
            duplicates_results = self._check_duplicates()
            statistics_results = self._calculate_statistics()
            
            # 3. Сохраняем результаты
            self._save_results(missing_results, duplicates_results, statistics_results)
            
            print(f"✅ Анализ завершён для {self.dataset.name}")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка при анализе: {str(e)}")
            raise
    
    def _load_csv(self):
        """Загружает CSV файл в DataFrame pandas."""
        try:
            self.df = pd.read_csv(self.file_path, encoding='utf-8')
            print(f"📊 Загружено: {len(self.df)} строк, {len(self.df.columns)} столбцов")
        except UnicodeDecodeError:
            try:
                self.df = pd.read_csv(self.file_path, encoding='cp1251')
                print(f"📊 Загружено с кодировкой cp1251")
            except Exception as e:
                print(f"❌ Ошибка загрузки CSV: {e}")
                raise
    
    def _check_missing_values(self):
        """Проверяет пропущенные значения."""
        print("🔍 Проверяем пропущенные значения...")
        
        total_cells = self.df.size
        missing_cells = self.df.isna().sum().sum()
        missing_percentage = (missing_cells / total_cells) * 100 if total_cells > 0 else 0
        
        # Детали по столбцам
        columns_with_missing = {}
        for column in self.df.columns:
            missing_count = self.df[column].isna().sum()
            if missing_count > 0:
                columns_with_missing[column] = int(missing_count)
        
        return {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'total_cells': int(total_cells),
            'missing_cells': int(missing_cells),
            'missing_percentage': round(missing_percentage, 2),
            'columns_with_missing': columns_with_missing
        }
    
    def _check_duplicates(self):
        """Проверяет дубликаты строк."""
        print("♻️ Проверяем дубликаты строк...")
        
        total_rows = len(self.df)
        duplicate_rows = self.df.duplicated().sum()
        duplicate_percentage = (duplicate_rows / total_rows) * 100 if total_rows > 0 else 0
        
        return {
            'total_rows': total_rows,
            'duplicate_rows': int(duplicate_rows),
            'duplicate_percentage': round(duplicate_percentage, 2)
        }
    
    def _calculate_statistics(self):
        """Считает базовую статистику."""
        print("📊 Считаем статистику...")
        
        numeric_stats = {}
        text_stats = {}
        
        for column in self.df.columns:
            # Для числовых столбцов
            if pd.api.types.is_numeric_dtype(self.df[column]):
                numeric_stats[column] = {
                    'min': float(self.df[column].min()) if not self.df[column].isna().all() else None,
                    'max': float(self.df[column].max()) if not self.df[column].isna().all() else None,
                    'mean': float(self.df[column].mean()) if not self.df[column].isna().all() else None,
                    'std': float(self.df[column].std()) if not self.df[column].isna().all() else None,
                    'missing': int(self.df[column].isna().sum())
                }
            
            # Для текстовых столбцов
            elif pd.api.types.is_string_dtype(self.df[column]):
                text_stats[column] = {
                    'unique_values': int(self.df[column].nunique()),
                    'most_common': str(self.df[column].mode().iloc[0]) if not self.df[column].mode().empty else None,
                    'missing': int(self.df[column].isna().sum())
                }
        
        return {
            'numeric_columns': numeric_stats,
            'text_columns': text_stats,
            'total_columns': len(self.df.columns)
        }
    
    def _save_results(self, missing_results, duplicates_results, statistics_results):
        """Сохраняет результаты в базу данных."""
        from .models import DataCheck, Report
        
        # УДАЛЯЕМ старые проверки этого датасета
        DataCheck.objects.filter(dataset=self.dataset).delete()
        
        # Сохраняем новые проверки
        DataCheck.objects.create(
            dataset=self.dataset,
            check_type='missing',
            result_json=missing_results
        )
        
        DataCheck.objects.create(
            dataset=self.dataset,
            check_type='duplicates',
            result_json=duplicates_results
        )
        
        DataCheck.objects.create(
            dataset=self.dataset,
            check_type='statistics',
            result_json=statistics_results
        )
        
        # Создаем сводный отчет
        issues_count = missing_results['missing_cells'] + duplicates_results['duplicate_rows']
        
        summary = f"""
📊 Сводный отчет по файлу {self.dataset.name}

📈 Общая информация:
- Строк: {missing_results['total_rows']}
- Столбцов: {missing_results['total_columns']}
- Ячеек: {missing_results['total_cells']}

⚠️ Проблемы качества данных:
- Пропущенных значений: {missing_results['missing_cells']} ({missing_results['missing_percentage']}%)
- Дубликатов строк: {duplicates_results['duplicate_rows']} ({duplicates_results['duplicate_percentage']}%)

💡 Рекомендации:
{self._generate_recommendations(missing_results, duplicates_results)}
        """
        
        # ОБНОВЛЯЕМ или СОЗДАЕМ отчет
        report, created = Report.objects.update_or_create(
            dataset=self.dataset,
            defaults={
                'summary': summary,
                'issues_count': int(issues_count)
            }
        )
        
        if created:
            print(f"✅ Создан новый отчет для {self.dataset.name}")
        else:
            print(f"✅ Обновлен существующий отчет для {self.dataset.name}")
            
    def _generate_recommendations(self, missing_results, duplicates_results):
        """Генерирует рекомендации на основе результатов."""
        recommendations = []
        
        if missing_results['missing_cells'] > 0:
            recommendations.append("• Обнаружены пропущенные значения. Рассмотрите:")
            recommendations.append("  - Заполнение средними/модальными значениями")
            recommendations.append("  - Удаление строк с пропусками (если их немного)")
        
        if duplicates_results['duplicate_rows'] > 0:
            recommendations.append("• Обнаружены дубликаты строк. Рекомендуется удалить.")
        
        if not recommendations:
            recommendations.append("• Качество данных хорошее! Серьезных проблем не обнаружено.")
        
        return "\n".join(recommendations)