import type { User } from '../types/user';

// 조류 이름 배열
const BIRD_NAMES = [
  "sparrow", "eagle", "owl", "parrot", "falcon", "heron", "crane", "duck", "swan", "magpie",
  "woodpecker", "kingfisher", "pigeon", "dove", "wren", "robin", "finch", "tit", "jay", "lark",
  "hawk", "vulture", "pelican", "seagull", "penguin", "ostrich", "emu", "kiwi", "albatross", "hummingbird"
];

// 조직명 배열
const ORGANIZATIONS = [
  "TechCorp", "DataFlow", "AI Solutions", "CloudTech", "Digital Dynamics",
  "Innovation Labs", "Future Systems", "Smart Solutions", "NextGen Tech", "Elite Computing",
  "Global Tech", "Advanced Systems", "Creative Solutions", "Dynamic Tech", "Premium Services"
];

// 사용 가능한 모델 배열
const AVAILABLE_MODELS = [
  "gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
  "gemini-pro", "llama-2-70b", "llama-2-13b", "llama-2-7b", "mistral-7b",
  "all-team-models"
];

// 사용 가능한 서비스 배열
const AVAILABLE_SERVICES = [
  "openai", "anthropic", "google", "meta", "mistral", "cohere", "perplexity"
];

// 랜덤 키 생성 함수
function getRandomBirdKey(): string {
  const bird = BIRD_NAMES[Math.floor(Math.random() * BIRD_NAMES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${bird}-${num}`;
}

// 랜덤 배열 요소 선택 함수
function getRandomArrayElements<T>(array: T[], minCount: number, maxCount: number): T[] {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 랜덤 날짜 생성 함수 (최근 1년 내)
function getRandomDate(): string {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTime).toISOString();
}

// 랜덤 사용자 생성 함수
function generateRandomUser(id: number): User {
  const userId = `user${id.toString().padStart(3, '0')}`;
  const organization = Math.random() > 0.3 ? ORGANIZATIONS[Math.floor(Math.random() * ORGANIZATIONS.length)] : undefined;
  const extraInfo = Math.random() > 0.5 ? `Test user ${id} - ${Math.random().toString(36).substring(7)}` : undefined;
  
  const allowedModels = getRandomArrayElements(AVAILABLE_MODELS, 1, 4);
  const allowedServices = getRandomArrayElements(AVAILABLE_SERVICES, 1, 3);
  
  const createdDate = getRandomDate();
  const updatedDate = new Date(createdDate).getTime() + Math.random() * (Date.now() - new Date(createdDate).getTime());
  
  return {
    user_id: userId,
    organization,
    key_value: getRandomBirdKey(),
    extra_info: extraInfo,
    created_at: createdDate,
    updated_at: new Date(updatedDate).toISOString(),
    allowed_models: allowedModels,
    allowed_services: allowedServices,
  };
}

// 100개의 테스트 사용자 데이터 생성
export function generateMockUsers(): User[] {
  const users: User[] = [];
  
  for (let i = 1; i <= 100; i++) {
    users.push(generateRandomUser(i));
  }
  
  return users;
}

// 특정 사용자 ID 목록으로 사용자 생성
export function generateMockUsersFromIds(userIds: string[], organization?: string, extraInfo?: string, allowedModels?: string[]): User[] {
  return userIds.map((userId) => ({
    user_id: userId,
    organization,
    key_value: getRandomBirdKey(),
    extra_info: extraInfo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    allowed_models: allowedModels || getRandomArrayElements(AVAILABLE_MODELS, 1, 3),
    allowed_services: getRandomArrayElements(AVAILABLE_SERVICES, 1, 2),
  }));
} 