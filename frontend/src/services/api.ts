// frontend/src/services/api.ts
// API КЛИЕНТ - методы для работы с бэкендом
import axios, { AxiosResponse } from 'axios';
import { API_CONFIG, getEndpoint, buildApiUrl, getApiUrl } from '../config/api';

// ===================== ИНИЦИАЛИЗАЦИЯ AXIOS =====================
// Единый экземпляр axios для всего приложения
export const api = axios.create({
    baseURL: API_CONFIG.FULL_API_URL,
    timeout: API_CONFIG.REQUEST_CONFIG.DEFAULT_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// ===================== ТИПЫ ДАННЫХ =====================
// Должны соответствовать Django сериализаторам

export type DatasetStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface Dataset {
    id: number;
    name: string;
    csv_file: string;           // URL к файлу
    uploaded_at: string;        // ISO строка
    status: DatasetStatus;
    status_display: string;
    checks: DataCheck[];
    report: Report | null;
    // Возможные дополнительные поля:
    // rows_count?: number;
    // file_size?: number;
    // columns?: string[];
}

export type CheckType = 'missing' | 'duplicates' | 'statistics';
// ВАЖНО: Должно совпадать с backend/data_quality/models.py

export interface DataCheck {
    id: number;
    check_type: CheckType;
    result_json: Record<string, any>;
    created_at: string;
    status?: 'pending' | 'completed' | 'failed';
    error_message?: string;
}

export interface Report {
    id: number;
    summary: string;
    issues_count: number;
    generated_at: string;
    rating?: number;            // 1-5 или 0-100
    recommendations?: string[]; // Список рекомендаций
}

export interface AnalysisSuccessResponse {
    status: 'success';
    message: string;
    dataset_id: number;
    view_url: string;
    dataset?: Dataset;          // Возможно возвращается обновлённый датасет
}

export interface AnalysisErrorResponse {
    status: 'error';
    message: string;
    dataset_id: number;
    details?: Record<string, any>;
    error_code?: string;
}

export type AnalysisResponse = AnalysisSuccessResponse | AnalysisErrorResponse;

// ===================== API МЕТОДЫ =====================
// Все методы используют конфигурацию из config/api.ts

export const datasetsApi = {
    // 1. Получить список всех датасетов
    getAll: (): Promise<AxiosResponse<Dataset[]>> =>
        api.get(getEndpoint('DATASETS')),

    // 2. Получить конкретный датасет по ID
    getById: (id: number): Promise<AxiosResponse<Dataset>> =>
        api.get(getEndpoint('DATASET_BY_ID', id)),

    // 3. Загрузить новый CSV файл
    uploadFile: (file: File, customName?: string): Promise<AxiosResponse<Dataset>> => {
        const formData = new FormData();
        formData.append('csv_file', file);

        // Имя датасета (убираем расширение .csv если есть)
        const datasetName = customName || file.name.replace(/\.csv$/i, '');
        formData.append('name', datasetName);

        return api.post(getEndpoint('UPLOAD_DATASET'), formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: API_CONFIG.REQUEST_CONFIG.UPLOAD_TIMEOUT,
            // Опционально: отслеживание прогресса
            // onUploadProgress: (progressEvent) => {
            //     const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            //     console.log(`Прогресс загрузки: ${percent}%`);
            // },
        });
    },

    // 4. Запустить анализ датасета
    analyzeDataset: (id: number): Promise<AxiosResponse<AnalysisResponse>> =>
        api.post(getEndpoint('ANALYZE_DATASET', id)),

    // 5. Удалить датасет
    deleteDataset: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(getEndpoint('DATASET_BY_ID', id)),

    // 6. Обновить датасет
    updateDataset: (id: number, data: Partial<Dataset>): Promise<AxiosResponse<Dataset>> =>
        api.patch(getEndpoint('DATASET_BY_ID', id), data),

    // 7. Скачать CSV файл (возвращает Blob)
    downloadCsv: (id: number): Promise<AxiosResponse<Blob>> =>
        api.get(`${getEndpoint('DATASET_BY_ID', id)}download/`, {
            responseType: 'blob',
        }),
};

// ===================== УТИЛИТНЫЕ ФУНКЦИИ =====================

/**
 * Строит полный URL для скачивания CSV файла
 * Обрабатывает относительные и абсолютные пути
 */
export const getCsvFileUrl = (csvFileUrl: string): string => {
    if (!csvFileUrl) return '';

    // Если уже абсолютный URL
    if (csvFileUrl.startsWith('http')) {
        return csvFileUrl;
    }

    // Если путь начинается с /media/ или /static/ (Django)
    if (csvFileUrl.startsWith('/media/') || csvFileUrl.startsWith('/static/')) {
        return `${API_CONFIG.BASE_URL}${csvFileUrl}`;
    }

    // По умолчанию считаем, что это относительный путь API
    return buildApiUrl(csvFileUrl);
};

/**
 * Ретри-логика для повторения запросов при сетевых ошибках
 */
export const withRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = API_CONFIG.REQUEST_CONFIG.MAX_RETRIES
): Promise<T> => {
    let lastError: any;
    let attempt = 1;

    while (attempt <= maxRetries) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Не повторяем для клиентских ошибок (4xx)
            if (error.response?.status >= 400 && error.response?.status < 500) {
                break;
            }

            // Ждём перед повторной попыткой (экспоненциальная задержка)
            if (attempt < maxRetries) {
                const delay = Math.min(
                    API_CONFIG.REQUEST_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1),
                    10000 // Максимум 10 секунд
                );

                console.log(`Повторная попытка ${attempt}/${maxRetries} через ${delay}мс`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            attempt++;
        }
    }

    throw lastError;
};

// ===================== ИНТЕРЦЕПТОРЫ =====================
// Глобальная обработка запросов и ответов

api.interceptors.request.use(
    (request) => {
        // Логирование только в development
        if (process.env.NODE_ENV === 'development' && !request.url?.includes('upload')) {
            console.log(`📤 [API Request] ${request.method?.toUpperCase()} ${request.url}`, {
                data: request.data,
                params: request.params,
            });
        }
        return request;
    },
    (error) => {
        console.error('❌ [API Request Error]', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        // Логирование только в development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📥 [API Response ${response.status}] ${response.config.url}`, {
                data: response.data,
            });
        }
        return response;
    },
    (error) => {
        // Обработка ошибок
        const status = error.response?.status || 'NETWORK';
        const url = error.config?.url || 'unknown';

        // Извлекаем сообщение об ошибке
        let errorMessage = 'Неизвестная ошибка API';
        if (error.response?.data) {
            errorMessage = error.response.data.detail ||
                error.response.data.message ||
                error.response.data.error ||
                JSON.stringify(error.response.data);
        } else if (error.message) {
            errorMessage = error.message;
        }

        console.error(`❌ [API Error ${status}] ${url}:`, errorMessage);

        // Глобальная обработка статусов
        switch (status) {
            case 401:
                console.warn('Требуется авторизация');
                // window.location.href = '/login';
                break;
            case 403:
                console.warn('Доступ запрещён');
                break;
            case 404:
                console.warn('Ресурс не найден');
                break;
            case 429:
                console.warn('Слишком много запросов');
                break;
            case 500:
            case 502:
            case 503:
                console.error('Ошибка сервера');
                // Можно показать уведомление
                break;
        }

        // Пробрасываем ошибку с дополнительной информацией
        return Promise.reject({
            ...error,
            userMessage: errorMessage,
            status,
            url,
            timestamp: new Date().toISOString(),
        });
    }
);

// Экспортируем утилиты для использования в компонентах
// Функции уже экспортированы выше, поэтому просто перечисляем их здесь
// для удобства (опционально, можно удалить эту строку)
// export { getApiUrl, getCsvFileUrl, withRetry };