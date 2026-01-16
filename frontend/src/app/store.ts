import { configureStore } from '@reduxjs/toolkit';
// Позже сюда импортируем редюсеры

export const store = configureStore({
    reducer: {
        // Здесь будут редюсеры (например, datasets: datasetsReducer)
    },
});

// Типы для TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;