import { DEBUG } from "../config";

// JWT 토큰 만료 시 자동 로그아웃 처리
const handleAuthError = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
  window.location.href = "/login";
};

// 공통 API 에러 처리 함수
export const handleApiError = async (response: Response): Promise<never> => {
  // JWT 토큰 관련 에러 (401, 403) 처리
  if (response.status === 401 || response.status === 403) {
    handleAuthError();
    throw new Error("Authentication failed. Please login again.");
  }

  // 기타 에러 처리
  let errorMsg = "Request failed";
  try {
    const data = await response.json();
    errorMsg = data.detail || errorMsg;
  } catch {
    // JSON 파싱 실패 시 기본 메시지 사용
  }

  throw new Error(errorMsg);
};

// 인증이 필요한 API 호출을 위한 공통 함수
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = localStorage.getItem("access_token");

  if (!token && !DEBUG) {
    handleAuthError();
    throw new Error("No authentication token found");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response;
};

// JSON 응답을 파싱하는 공통 함수
export const fetchJson = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await authenticatedFetch(url, options);
  return response.json();
};
