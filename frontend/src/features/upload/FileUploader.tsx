import React, { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { uploadDataset, clearError } from '../datasets/DatasetsSlice';
import { FaUpload, FaTimes } from 'react-icons/fa';

const FileUploader = () => {
    const dispatch = useAppDispatch();
    const { loading, error, uploadProgress } = useAppSelector((state) => state.datasets);

    const [file, setFile] = useState<File | null>(null);
    const [customName, setCustomName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Проверяем, что файл CSV
            if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
                alert('Пожалуйста, выберите CSV файл');
                return;
            }

            setFile(selectedFile);
            setCustomName(selectedFile.name.replace('.csv', ''));
            dispatch(clearError()); // Очищаем предыдущие ошибки
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Сначала выберите файл');
            return;
        }

        try {
            // ПЕРЕДАЁМ ОБЪЕКТ С customName
            await dispatch(uploadDataset({
                file,
                customName: customName || undefined
            })).unwrap();

            // Сброс формы...
        } catch (err) {
            console.error('Ошибка загрузки:', err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.toLowerCase().endsWith('.csv')) {
                setFile(droppedFile);
                setCustomName(droppedFile.name.replace('.csv', ''));
                dispatch(clearError());
            } else {
                alert('Пожалуйста, перетащите CSV файл');
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FaUpload /> Загрузка CSV файла
            </h2>

            {/* Область для перетаскивания файла - ИСПРАВЛЕННАЯ ВЕРСИЯ */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors
            ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}
            ${error ? 'border-red-500 bg-red-50' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            // УБРАЛИ onClick отсюда!
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                />

                <div
                    className="cursor-pointer"
                    onClick={() => fileInputRef.current?.click()} // ← Кликабельная ТОЛЬКО эта часть
                >
                    <div className="text-4xl mb-4">📁</div> {/* Иконка */}

                    {file ? (
                        <div>
                            <p className="text-lg font-semibold text-green-700">
                                ✅ Выбран файл: {file.name}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                                Размер: {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-semibold mb-2">Перетащите CSV файл сюда</p>
                            <p className="text-gray-600">или <span className="text-blue-600 underline">нажмите для выбора файла</span></p>
                            <p className="text-sm text-gray-500 mt-2">Поддерживаются только файлы .csv</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Поле для имени датасета */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название датасета (необязательно)
                </label>
                <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите название для датасета"
                />
            </div>

            {/* Прогресс-бар */}
            {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Загрузка...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Сообщения об ошибках */}
            {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                    <FaTimes className="mr-3" />
                    <span>{error}</span>
                </div>
            )}

            {/* Кнопка загрузки */}
            <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-3 transition-colors
          ${!file || loading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
                {loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Загрузка...
                    </>
                ) : (
                    <>
                        <FaUpload />
                        {file ? `Загрузить "${file.name}"` : 'Выберите файл для загрузки'}
                    </>
                )}
            </button>

            {/* Статус после загрузки */}
            {uploadProgress === 100 && !error && (
                <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <p className="font-semibold">✅ Файл успешно загружен!</p>
                    <p className="text-sm mt-1">
                        Теперь вы можете запустить анализ этого датасета.
                    </p>
                </div>
            )}
        </div>
    );
};

export default FileUploader;