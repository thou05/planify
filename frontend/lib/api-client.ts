const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

interface RequestOptions extends RequestInit {
  data?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  error?: string;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { data, headers = {}, ...customConfig } = options;

  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('planify_token');
  }

  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  if (data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, config);

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseData?.message;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : (typeof message === 'string' ? message : 'Yêu cầu không thành công'), response.status);
  }

  return responseData as ApiResponse<T>;
}
