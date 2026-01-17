import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchDatasets, analyzeDataset } from './datasetsSlice';
import { DatasetStatus } from '../../services/api'; //

const DatasetList = () => {
    console.log('=== RENDER DatasetList ===');

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { items: datasets, loading, error } = useAppSelector(
        (state) => state.datasets
    );

    // Мемоизируем датасеты чтобы избежать лишних рендеров
    const memoizedDatasets = useMemo(() => datasets, [
        // Используем JSON.stringify для создания стабильной зависимости
        JSON.stringify(datasets.map(d => ({
            id: d.id,
            status: d.status,
            checksLength: d.checks?.length || 0
        })))
    ]);

    console.log('Datasets data:', memoizedDatasets);
    // ← ДЕБАГ

    // useEffect(() => {
    //     if (datasets.length === 0 && !loading) {
    //         dispatch(fetchDatasets());
    //     }
    // }, [dispatch, datasets.length, loading]);

    useEffect(() => {
        dispatch(fetchDatasets());
    }, [dispatch]);


    const handleAnalyze = (dataset: any) => {
        if (dataset.status === 'uploaded') {
            dispatch(analyzeDataset(dataset.id))
                .unwrap()
                .then(() => {
                    dispatch(fetchDatasets());
                });
        }
    };

    const getStatusBadge = (status: DatasetStatus) => {
        const config = {
            uploaded: { color: 'bg-blue-100 text-blue-800', icon: '📥', text: 'Загружен' },
            processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⚙️', text: 'В обработке' },
            completed: { color: 'bg-green-100 text-green-800', icon: '✅', text: 'Обработан' },
            failed: { color: 'bg-red-100 text-red-800', icon: '❌', text: 'Ошибка' },
        };
        const { color, icon, text } = config[status];
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                {icon} {text}
            </span>
        );
    };

    if (loading && datasets.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Загружаем список датасетов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-700 font-medium">Ошибка загрузки: {error}</p>
                <button
                    onClick={() => dispatch(fetchDatasets())}
                    className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                    Повторить попытку
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="text-3xl">📁</span>
                    Загруженные датасеты
                    <span className="text-sm font-normal bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                        {datasets.length} файлов
                    </span>
                </h2>
                <button
                    onClick={() => dispatch(fetchDatasets())}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                    🔄 Обновить
                </button>
            </div>

            {datasets.length === 0 ? (
                <div className="text-center py-10">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-gray-500 text-lg">Нет загруженных датасетов</p>
                    <p className="text-gray-400 mt-2">Загрузите первый CSV файл выше</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {datasets.map((dataset: any) => (
                        <div
                            key={dataset.id}
                            className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Левая часть: информация о датасете */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800 truncate">
                                            {dataset.name}
                                        </h3>
                                        {getStatusBadge(dataset.status)}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📅</span>
                                            <span>{new Date(dataset.uploaded_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">🔢</span>
                                            <span>
                                                {dataset.checks?.length || 0} проверок
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📊</span>
                                            <span>
                                                {dataset.report?.issues_count || 0} проблем
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">#</span>
                                            <span className="font-mono">ID: {dataset.id}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Правая часть: кнопки действий */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => navigate(`/dataset/${dataset.id}`)}
                                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                                    >
                                        👁️ Подробнее
                                    </button>

                                    {dataset.status === 'uploaded' && (
                                        <button
                                            onClick={() => handleAnalyze(dataset)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                        >
                                            🔍 Анализировать
                                        </button>
                                    )}

                                    {dataset.status === 'completed' && (
                                        <button
                                            onClick={() => navigate(`/dataset/${dataset.id}`)}
                                            className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 flex items-center justify-center gap-2"
                                        >
                                            📄 Отчёт
                                        </button>
                                    )}

                                    {dataset.status === 'failed' && (
                                        <button
                                            onClick={() => handleAnalyze(dataset)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                                        >
                                            🔄 Повторить
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Детали при клике */}
                            {dataset.report?.summary && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-gray-700 line-clamp-2">
                                        {dataset.report.summary}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DatasetList;