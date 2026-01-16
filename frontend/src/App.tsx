import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Импорт маршрутизации
import FileUploader from './features/upload/FileUploader';
import DatasetList from './features/datasets/DatasetList';
import DatasetDetails from './features/datasets/DatasetDetails';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      {/* Хедер */}
      <header className="max-w-7xl mx-auto mb-8 md:mb-12 text-center">
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 mb-4 p-5 md:p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20">
          <div className="text-4xl md:text-5xl animate-pulse">📊</div>
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Data Quality Dashboard
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto text-base md:text-lg">
              Профессиональный анализ качества CSV данных: пропуски, дубликаты, статистика
            </p>
          </div>
        </div>
      </header>

      {/* Основной контент С МАРШРУТИЗАЦИЕЙ */}
      <main className="max-w-7xl mx-auto">
        <Routes>
          {/* Главная страница */}
          <Route path="/" element={
            <>
              {/* Верхняя часть: Загрузка + Инфо-панель */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Колонка загрузки (8/12 ширины) */}
                <div className="lg:col-span-8">
                  <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 border border-gray-100 h-full">
                    <FileUploader />
                  </div>
                </div>

                {/* Колонка информационных карточек (4/12 ширины) */}
                <div className="lg:col-span-4">
                  <div className="sticky top-6 space-y-5">
                    {/* Компактная карточка "Как это работает" */}
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-5 border border-blue-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                          <span className="text-2xl text-white">⚙️</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Как это работает</h2>
                      </div>
                      <div className="space-y-3.5">
                        {[
                          { step: '📥', text: 'Загрузите CSV' },
                          { step: '🔍', text: 'Автоматический анализ' },
                          { step: '📊', text: 'Детальный отчёт' },
                          { step: '💡', text: 'Рекомендации' }
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 group">
                            <div className="flex-shrink-0 w-10 h-10 bg-white border border-blue-200 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                              {item.step}
                            </div>
                            <span className="text-gray-700 font-medium text-sm">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Компактная карточка "Что проверяется" */}
                    <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-5 border border-green-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                          <span className="text-2xl text-white">✅</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Что проверяется</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          'Пропуски',
                          'Дубликаты',
                          'Статистика',
                          'Уникальные значения',
                          'Формат данных',
                          'Заполненность'
                        ].map((item, idx) => (
                          <div key={idx} className="bg-white/70 rounded-lg p-2.5 text-center border border-green-100">
                            <span className="text-green-700 font-medium text-xs md:text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Компактная карточка "Форматы" */}
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-5 border border-purple-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                          <span className="text-2xl text-white">📁</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Форматы</h2>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-purple-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                              <span className="text-blue-700 font-mono font-bold text-sm">.CSV</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">CSV файл</p>
                              <p className="text-gray-500 text-xs">UTF-8, до 10MB</p>
                            </div>
                          </div>
                          <div className="px-2.5 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-bold rounded-full">
                            ✅
                          </div>
                        </div>
                        <div className="text-center pt-2">
                          <p className="text-gray-500 text-xs">
                            Также: .XLSX, .XLS (скоро)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Нижняя часть: Список датасетов на всю ширину */}
              <div className="mt-6 md:mt-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-6 border border-gray-100">
                  <DatasetList />
                </div>
              </div>
            </>
          } />

          {/* Страница деталей датасета */}
          <Route path="/dataset/:id" element={<DatasetDetails />} />
        </Routes>
      </main>

      {/* Футер */}
      <footer className="max-w-7xl mx-auto mt-10 md:mt-14 pt-6 md:pt-8 border-t border-gray-200/50 text-center">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <p className="text-sm md:text-base">
              <span className="font-semibold text-gray-700">Data Quality Dashboard</span> • React + Django • 2024
            </p>
          </div>
          <div className="flex gap-5 md:gap-6">
            <a href="https://github.com/ZzAlexDev/data-quality-dashboard" className="text-gray-500 hover:text-blue-600 transition-colors text-sm md:text-base flex items-center gap-1.5">
              <span className="text-lg">🐙</span> GitHub
            </a>
            <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors text-sm md:text-base flex items-center gap-1.5">
              <span className="text-lg">📚</span> Документация
            </a>
            <a href="#" className="text-gray-500 hover:text-green-600 transition-colors text-sm md:text-base flex items-center gap-1.5">
              <span className="text-lg">📧</span> Контакты
            </a>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          <p>Анализ качества данных в реальном времени • Версия 1.0</p>
        </div>
      </footer>
    </div>
  );
}

export default App;