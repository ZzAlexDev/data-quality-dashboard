import { configureStore } from '@reduxjs/toolkit';
import datasetsReducer from '../features/datasets/DatasetsSlice'; // Добавляем импорт

export const store = configureStore({
    reducer: {
        datasets: datasetsReducer, // Регистрируем редюсер
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Игнорируем проверку для File объектов в действиях (это нормально)
                ignoredActions: ['datasets/upload/pending'],
                ignoredPaths: ['datasets.upload.file'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;