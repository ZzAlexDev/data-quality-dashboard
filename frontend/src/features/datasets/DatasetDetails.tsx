import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchDatasets, analyzeDataset, updateDataset } from './datasetsSlice';
import { DataCheck } from '../../services/api';
import { datasetsApi } from '../../services/api';

const DatasetDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { items: datasets, loading, error } = useAppSelector(
        (state) => state.datasets
    );

    const datasetId = parseInt(id || '0');
    const dataset = datasets.find(d => d.id === datasetId);


    // === АВТООБНОВЛЕНИЕ СТАТУСА ===
    useEffect(() => {
        // Проверка на существование датасета


        if (!dataset || dataset.status !== 'processing') return;

        console.log('🔄 Запускаем автообновление для датасета', dataset.id);

        let isPollingActive = true;
        let timeoutId: NodeJS.Timeout;

        const pollStatus = async () => {
            if (!isPollingActive) return;

            try {
                console.log('📡 Опрашиваем статус датасета', dataset.id);

                const response = await datasetsApi.getById(datasetId);
                const freshDataset = response.data;



                if (freshDataset.status !== dataset.status) {
                    console.log('✅ Статус обновился!');
                    dispatch(updateDataset(freshDataset));

                    if (freshDataset.status === 'completed' || freshDataset.status === 'failed') {
                        console.log('🏁 Анализ завершён');
                        isPollingActive = false;
                        return;
                    }
                }

                if (isPollingActive && freshDataset.status === 'processing') {
                    timeoutId = setTimeout(pollStatus, 3000);
                }

            } catch (error) {
                console.error('❌ Ошибка:', error);
                if (isPollingActive) {
                    timeoutId = setTimeout(pollStatus, 5000);
                }
            }
        };

        pollStatus();

        return () => {
            console.log('🛑 Останавливаем автообновление');
            isPollingActive = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [dataset, dispatch]);    // Функция для запуска анализа


    const handleAnalyze = () => {
        if (dataset && dataset.status === 'uploaded') {
            dispatch(analyzeDataset(dataset.id));
        }
    };

    // Компонент для пропущенных значений
    const renderMissingValues = (check: DataCheck) => {
        const data = check.result_json || {};
        const missingPercentage = data.missing_percentage || 0;

        const QUALITY_THRESHOLDS = {
            EXCELLENT: 5,
            GOOD: 20
        } as const;

        return (
            <div className="space-y-6">
                {/* Статистика в карточках */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-gray-500 mb-1">Всего строк</p>
                        <p className="text-2xl font-bold text-blue-700">
                            {data.total_rows?.toLocaleString() || '0'}
                        </p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-sm text-gray-500 mb-1">Пропусков</p>
                        <p className="text-2xl font-bold text-red-700">
                            {data.total_missing?.toLocaleString() || '0'}
                        </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <p className="text-sm text-gray-500 mb-1">Процент</p>
                        <p className="text-2xl font-bold text-amber-700">
                            {(missingPercentage || 0).toFixed(1)}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                                className={`h-2 rounded-full ${missingPercentage > 20 ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(missingPercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-sm text-gray-500 mb-1">Качество</p>
                        <p className="text-2xl font-bold text-green-700">
                            {missingPercentage < QUALITY_THRESHOLDS.EXCELLENT ? 'Отлично' :
                                missingPercentage < QUALITY_THRESHOLDS.GOOD ? 'Нормально' : 'Плохо'}
                        </p>
                    </div>
                </div>

                {/* Столбцы с пропусками */}
                {data.columns && Object.keys(data.columns).length > 0 && (
                    <div className="mt-6">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="text-red-500">📍</span>
                            Пропуски по столбцам:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(data.columns).map(([column, colData]: [string, any]) => {
                                const colMissing = colData.missing_count || 0;
                                const colPercentage = colData.missing_percentage || 0;

                                return (
                                    <div key={column} className="bg-white border border-gray-200 p-4 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="font-bold text-gray-800">{column}</h5>
                                                <p className="text-sm text-gray-500">
                                                    {colData.dtype || 'unknown type'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colPercentage === 0 ? 'bg-green-100 text-green-700' :
                                                colPercentage < 10 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {colMissing} пропусков
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            <div className="flex justify-between text-sm text-gray-500 mb-1">
                                                <span>{colPercentage.toFixed(1)}% строк</span>
                                                <span>{colMissing} из {data.total_rows}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${colPercentage === 0 ? 'bg-green-500' :
                                                        colPercentage < 10 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${Math.min(colPercentage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Компонент для дубликатов
    const renderDuplicates = (check: DataCheck) => {
        const data = check.result_json || {};
        const duplicatePercentage = data.duplicate_percentage || 0;
        const DUPLICATE_THRESHOLD = 10; // порог для красного цвета

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-gray-500 mb-1">Всего строк</p>
                        <p className="text-2xl font-bold text-blue-700">
                            {data.total_rows?.toLocaleString() || '0'}
                        </p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-sm text-gray-500 mb-1">Дубликатов</p>
                        <p className="text-2xl font-bold text-purple-700">
                            {data.duplicate_rows?.toLocaleString() || '0'}
                        </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <p className="text-sm text-gray-500 mb-1">Процент</p>
                        <p className="text-2xl font-bold text-amber-700">
                            {duplicatePercentage.toFixed(1)}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                                className={`h-2 rounded-full ${duplicatePercentage > DUPLICATE_THRESHOLD ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(duplicatePercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {data.duplicate_rows > 0 ? (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-yellow-700">
                            Обнаружено <strong>{data.duplicate_rows} дублирующихся строк</strong> ({duplicatePercentage}%).
                            Рекомендуется удалить дубликаты.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-700">✅ Дубликатов не обнаружено.</p>
                    </div>
                )}
            </div>
        );
    };

    // Компонент для статистики
    const renderStatistics = (check: DataCheck) => {
        const data = check.result_json || {};

        return (
            <div className="space-y-6">
                {data.numeric_columns && Object.keys(data.numeric_columns).length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="text-blue-500">🔢</span>
                            Числовые столбцы:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(data.numeric_columns).map(([column, stats]: [string, any]) => (
                                <div key={column} className="bg-white border border-gray-200 p-4 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-gray-800 truncate">{column}</h5>
                                        {stats.missing > 0 ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                                {stats.missing} пропусков
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                                заполнен
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                <p className="text-xs text-gray-500">Мин</p>
                                                <p className="font-bold">{stats.min?.toLocaleString() ?? 'N/A'}</p>
                                            </div>
                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                <p className="text-xs text-gray-500">Макс</p>
                                                <p className="font-bold">{stats.max?.toLocaleString() ?? 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 bg-green-50 rounded">
                                                <p className="text-xs text-gray-500">Среднее</p>
                                                <p className="font-bold">{stats.mean?.toFixed(2) ?? 'N/A'}</p>
                                            </div>
                                            <div className="text-center p-2 bg-green-50 rounded">
                                                <p className="text-xs text-gray-500">Отклонение</p>
                                                <p className="font-bold">{stats.std?.toFixed(2) ?? 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.categorical_columns && Object.keys(data.categorical_columns).length > 0 && (
                    <div className="mt-6">
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="text-green-500">📝</span>
                            Категориальные столбцы:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(data.categorical_columns).map(([column, stats]: [string, any]) => (
                                <div key={column} className="bg-white border border-gray-200 p-4 rounded-xl">
                                    <h5 className="font-bold text-gray-800 mb-3">{column}</h5>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Уникальных значений</p>
                                                    <p className="font-bold text-lg">{stats.unique_values ?? 0}</p>
                                                </div>
                                            </div>
                                            {stats.most_common && (
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Самое частое</p>
                                                    <p className="font-bold text-gray-800 truncate max-w-[150px]">
                                                        {stats.most_common}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm text-gray-500 mb-1">
                                                <span>Уникальность:</span>
                                                <span>
                                                    {stats.unique_values && data.total_rows
                                                        ? Math.round((stats.unique_values / data.total_rows) * 100)
                                                        : 0}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min((stats.unique_values / (data.total_rows || 1)) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        {stats.missing > 0 && (
                                            <div className="p-3 bg-red-50 rounded-lg">
                                                <p className="text-red-700 text-sm">
                                                    <span className="font-medium">⚠️ Внимание:</span> {stats.missing} пропущенных значений
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Загрузка
    if (loading && !dataset) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Ошибка
    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 text-5xl mb-4">❌</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Ошибка</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    ← Вернуться к списку
                </button>
            </div>
        );
    }

    // Датасет не найден
    if (!dataset) {
        return (
            <div className="text-center py-12">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Датасет не найден</h2>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    ← Вернуться к списку
                </button>
            </div>
        );
    }

    // Основной интерфейс
    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Навигация */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 group"
                >
                    <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Назад к списку датасетов</span>
                </button>

                {/* Заголовок и информация */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">{dataset.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-gray-600">
                            <span className="flex items-center gap-1.5">
                                <span>📅</span>
                                {new Date(dataset.uploaded_at).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span>🆔</span>
                                ID: {dataset.id}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span>📊</span>
                                {dataset.checks.length} проверок
                            </span>
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {dataset.status === 'uploaded' && (
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-3"
                            >
                                <span className="text-xl">🔍</span>
                                <span>{loading ? 'Запуск...' : 'Запустить анализ'}</span>
                            </button>
                        )}

                        <a
                            href={dataset.csv_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-3"
                        >
                            <span className="text-xl">⬇️</span>
                            <span>Скачать CSV</span>
                        </a>
                    </div>
                </div>

                {/* Статус */}
                <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl ${dataset.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                    dataset.status === 'processing' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        dataset.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                    <span className="text-2xl">
                        {dataset.status === 'completed' ? '✅' :
                            dataset.status === 'processing' ? '⚙️' :
                                dataset.status === 'failed' ? '❌' : '📥'}
                    </span>
                    <div>
                        <span className="font-semibold">{dataset.status_display}</span>
                        <p className="text-sm opacity-80">
                            {dataset.status === 'completed' ? 'Анализ завершён' :
                                dataset.status === 'processing' ? 'Идёт обработка...' :
                                    dataset.status === 'failed' ? 'Произошла ошибка' : 'Готов к анализу'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Отчет если есть */}
            {dataset.report && (
                <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Сводный отчет</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {dataset.report.summary.split(' - ').map((line, index) => (
                                <div key={index} className="mb-2">
                                    {line.trim()}
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                Проблем: {dataset.report.issues_count}
                            </span>
                            <span className="text-gray-500 text-sm">
                                Создан: {new Date(dataset.report.generated_at).toLocaleString('ru-RU')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Результаты проверок */}
            <div className="space-y-8">
                {dataset.checks.length === 0 ? (
                    // Нет проверок
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-5xl mb-4">📊</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">
                            {dataset.status === 'processing' ? 'Анализ выполняется...' : 'Анализ не выполнен'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {dataset.status === 'uploaded'
                                ? 'Запустите анализ для проверки качества данных.'
                                : 'Пожалуйста, подождите...'}
                        </p>
                        {dataset.status === 'uploaded' && (
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400"
                            >
                                🚀 Запустить анализ
                            </button>
                        )}
                    </div>
                ) : (
                    // Отображение проверок
                    dataset.checks.map((check) => {
                        let content;

                        switch (check.check_type) {
                            case 'missing':
                                content = renderMissingValues(check);
                                break;
                            case 'duplicates':
                                content = renderDuplicates(check);
                                break;
                            case 'statistics':
                                content = renderStatistics(check);
                                break;
                            default:
                                content = (
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                                        {JSON.stringify(check.result_json, null, 2)}
                                    </pre>
                                );
                        }

                        return (
                            <div key={check.id} className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`p-3 rounded-xl ${check.check_type === 'missing' ? 'bg-red-100' :
                                        check.check_type === 'duplicates' ? 'bg-yellow-100' :
                                            'bg-blue-100'
                                        }`}>
                                        <span className="text-2xl">
                                            {check.check_type === 'missing' ? '🔍' :
                                                check.check_type === 'duplicates' ? '♻️' : '📊'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">
                                            {check.check_type === 'missing' ? 'Пропущенные значения' :
                                                check.check_type === 'duplicates' ? 'Дубликаты строк' :
                                                    'Статистика данных'}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            Выполнено: {new Date(check.created_at).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                </div>
                                {content}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DatasetDetails; // ← default export