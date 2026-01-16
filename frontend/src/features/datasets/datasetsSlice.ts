import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { datasetsApi, Dataset, DatasetStatus, AnalysisSuccessResponse, AnalysisErrorResponse } from '../../services/api';

// Состояние, которое будет храниться в Redux
interface DatasetsState {
    items: Dataset[];
    currentDataset: Dataset | null;
    loading: boolean;
    error: string | null;
    uploadProgress: number;
}

// Начальное состояние
const initialState: DatasetsState = {
    items: [],
    currentDataset: null,
    loading: false,
    error: null,
    uploadProgress: 0,
};

// ===================== АСИНХРОННЫЕ ЭКШЕНЫ (Thunks) =====================
// Они вызывают API и автоматически генерируют действия (pending, fulfilled, rejected)

// 1. Thunk для получения списка всех датасетов
export const fetchDatasets = createAsyncThunk(
    'datasets/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await datasetsApi.getAll();
            return response.data; // Массив Dataset[]
        } catch (error: any) {
            // Возвращаем ошибку в формате, понятном для Redux
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

// 2. Thunk для загрузки нового файла (ОСНОВНОЙ!)
export const uploadDataset = createAsyncThunk(
    'datasets/upload',
    async (payload: { file: File; customName?: string }, { rejectWithValue }) => {
        try {
            const response = await datasetsApi.uploadFile(payload.file, payload.customName);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);


// 3. Thunk для запуска анализа датасета
export const analyzeDataset = createAsyncThunk(
    'datasets/analyze',
    async (datasetId: number, { rejectWithValue }) => {
        try {
            const response = await datasetsApi.analyzeDataset(datasetId);
            return response.data; // AnalysisSuccessResponse или AnalysisErrorResponse
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

// ===================== САМ SLICE =====================
// Определяет, как состояние меняется в ответ на действия

const datasetsSlice = createSlice({
    name: 'datasets',
    initialState,
    reducers: {
        // Синхронные редюсеры для ручного управления
        setUploadProgress: (state, action: PayloadAction<number>) => {
            state.uploadProgress = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        setCurrentDataset: (state, action: PayloadAction<Dataset | null>) => {
            state.currentDataset = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Обработка всех состояний асинхронных thunk'ов
        builder
            // ========== fetchDatasets ==========
            .addCase(fetchDatasets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDatasets.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchDatasets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string || 'Ошибка загрузки датасетов';
            })

            // ========== uploadDataset ==========
            .addCase(uploadDataset.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.uploadProgress = 0;
            })
            .addCase(uploadDataset.fulfilled, (state, action) => {
                state.loading = false;
                state.uploadProgress = 100;
                // Добавляем новый датасет в начало списка
                state.items.unshift(action.payload);
                // И устанавливаем его как текущий
                state.currentDataset = action.payload;
            })
            .addCase(uploadDataset.rejected, (state, action) => {
                state.loading = false;
                state.uploadProgress = 0;
                state.error = action.payload as string || 'Ошибка загрузки файла';
            })

            // ========== analyzeDataset ==========
            .addCase(analyzeDataset.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(analyzeDataset.fulfilled, (state, action) => {
                state.loading = false;
                // Обновляем статус датасета, если анализ запущен успешно
                const successResponse = action.payload as AnalysisSuccessResponse;
                if (state.currentDataset && state.currentDataset.id === successResponse.dataset_id) {
                    state.currentDataset.status = 'completed';
                }
                // Также можно обновить датасет в списке
                const index = state.items.findIndex(d => d.id === successResponse.dataset_id);
                if (index !== -1) {
                    state.items[index].status = 'completed';
                }
            })
            .addCase(analyzeDataset.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string || 'Ошибка анализа';
                // Обновляем статус датасета на 'failed'
                const errorResponse = action.payload as AnalysisErrorResponse;
                if (state.currentDataset && state.currentDataset.id === errorResponse?.dataset_id) {
                    state.currentDataset.status = 'failed';
                }
            });
    },
});

// Экспортируем синхронные действия (actions) и редюсер
export const { setUploadProgress, clearError, setCurrentDataset } = datasetsSlice.actions;
export default datasetsSlice.reducer;