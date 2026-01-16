// frontend/src/services/api.ts
import axios, { AxiosResponse } from 'axios';

// Базовый URL твоего Django бэкенда
const API_BASE_URL = 'http://localhost:8000/api';

// Создаём экземпляр axios с настройками
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ===================== ТИПЫ ДАННЫХ =====================
// Полное соответствие твоим моделям из backend/data_quality/models.py

export type DatasetStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface Dataset {
    id: number;
    name: string;
    csv_file: string; // URL к файлу
    uploaded_at: string; // ISO строка даты
    status: DatasetStatus;
    status_display: string;
    checks: DataCheck[];
    report: Report | null;
}

export type CheckType = 'missing' | 'duplicates' | 'statistics';

export interface DataCheck {
    id: number;
    check_type: CheckType;
    result_json: Record<string, any>; // Любой JSON объект
    created_at: string;
}

export interface Report {
    id: number;
    summary: string;
    issues_count: number;
    generated_at: string;
}

// Тип для успешного ответа при анализе
export interface AnalysisSuccessResponse {
    status: 'success';
    message: string;
    dataset_id: number;
    view_url: string;
}

// Тип для ответа с ошибкой
export interface AnalysisErrorResponse {
    status: 'error';
    message: string;
    dataset_id: number;
}

// ===================== API МЕТОДЫ =====================

export const datasetsApi = {
    // 1. Получить список всех датасетов
    getAll: (): Promise<AxiosResponse<Dataset[]>> => api.get<Dataset[]>('/datasets/'),

    // 2. Получить конкретный датасет по ID
    getById: (id: number): Promise<AxiosResponse<Dataset>> =>
        api.get<Dataset>(`/datasets/${id}/`),

    // 3. Загрузить новый CSV файл (ОСНОВНОЙ МЕТОД)
    uploadFile: (file: File, customName?: string): Promise<AxiosResponse<Dataset>> => {
        const formData = new FormData();
        formData.append('csv_file', file);
        // Используем кастомное имя или имя файла
        formData.append('name', customName || file.name);

        return api.post<Dataset>('/datasets/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // 4. Запустить анализ датасета
    analyzeDataset: (
        id: number
    ): Promise<AxiosResponse<AnalysisSuccessResponse | AnalysisErrorResponse>> =>
        api.post(`/datasets/${id}/analyze/`),

    // 5. Удалить датасет
    deleteDataset: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(`/datasets/${id}/`),
};

// ===================== ИНТЕРЦЕПТОРЫ =====================
// Для отладки: логируем все запросы и ответы

api.interceptors.request.use(
    (request) => {
        console.log(
            `📤 [API Request] ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`,
            request.data
        );
        return request;
    },
    (error) => {
        console.error('❌ [API Request Error]', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`📥 [API Response ${response.status}]`, response.data);
        return response;
    },
    (error) => {
        // Обработка ошибок сети или от сервера
        const errorMessage = error.response?.data?.detail ||
            error.response?.data?.error ||
            error.message ||
            'Unknown API error';

        console.error(
            `❌ [API Error ${error.response?.status || 'NETWORK'}]`,
            errorMessage,
            error.response?.data
        );

        // Можно добавить уведомление для пользователя здесь
        // Например: toast.error(`API Error: ${errorMessage}`);

        return Promise.reject(error);
    }
);