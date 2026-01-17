// frontend/src/config/api.ts
// КОНФИГУРАЦИЯ API - единый источник правды для всех API настроек

// Базовый URL из переменных окружения
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api'; // Префикс API

// Основная конфигурация API
export const API_CONFIG = {
    // URL компоненты
    BASE_URL: API_BASE_URL,
    API_PREFIX: API_PREFIX,

    // Полный URL для API запросов
    get FULL_API_URL() {
        return `${this.BASE_URL}${this.API_PREFIX}`;
    },

    // Все эндпоинты приложения (единый источник)
    ENDPOINTS: {
        // Дашборды
        DATASETS: '/datasets/',
        DATASET_BY_ID: (id: number) => `/datasets/${id}/`,
        ANALYZE_DATASET: (id: number) => `/datasets/${id}/analyze/`,
        UPLOAD_DATASET: '/datasets/upload/',

        // Проверки
        CHECKS: '/checks/',
        CHECK_BY_ID: (id: number) => `/checks/${id}/`,

        // Отчёты
        REPORTS: '/reports/',
    } as const,

    // Настройки запросов
    REQUEST_CONFIG: {
        DEFAULT_TIMEOUT: 30000,      // 30 секунд
        UPLOAD_TIMEOUT: 120000,      // 2 минуты для загрузки
        MAX_RETRIES: 3,              // Количество попыток
        RETRY_DELAY: 1000,           // Задержка между попытками
    },
} as const;

// Типы для эндпоинтов (для TypeScript)
export type ApiEndpointKey = keyof typeof API_CONFIG.ENDPOINTS;

// Утилита для получения эндпоинта
export const getEndpoint = (
    key: ApiEndpointKey,
    ...params: any[]
): string => {
    const endpoint = API_CONFIG.ENDPOINTS[key];

    if (typeof endpoint === 'function') {
        // Безопасный вызов функции с параметрами
        try {
            return (endpoint as (...args: any[]) => string)(...params);
        } catch (error) {
            console.error(`Ошибка построения эндпоинта для ключа "${key}":`, error);
            return '';
        }
    }

    return endpoint;
};

// Утилита для построения полного URL
export const buildApiUrl = (endpoint: string): string => {
    // Если endpoint уже содержит базовый URL, возвращаем как есть
    if (endpoint.startsWith('http')) {
        return endpoint;
    }

    // Добавляем API префикс если его нет
    let fullEndpoint = endpoint;
    if (!fullEndpoint.startsWith(API_CONFIG.API_PREFIX)) {
        fullEndpoint = `${API_CONFIG.API_PREFIX}${fullEndpoint}`;
    }

    return `${API_CONFIG.BASE_URL}${fullEndpoint}`;
};

// Утилита для построения URL из ключа эндпоинта
export const getApiUrl = (
    endpointKey: ApiEndpointKey,
    ...params: any[]
): string => {
    const endpoint = getEndpoint(endpointKey, ...params);
    return buildApiUrl(endpoint);
};