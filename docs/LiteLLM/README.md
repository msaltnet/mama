# 개발용 LiteLLM 설치

## 설치 및 실행
docker compose up -d
🎉 이 명령 하나로:

tinyllama1, tinyllama2, tinyllama3가 각각 Ollama 모델 서버로 뜨고
postgres가 DB 서버로 실행되고
litellm이 설정된 모델 목록을 불러와서 프록시 API 서버로 동작하게 됩니다

✅ 이후 필수 초기 작업 (최초 1회만)
Litellm이 모델 프록시를 올바르게 처리하려면 각 Ollama 인스턴스에 모델 다운로드 및 로드 명령을 실행해야 합니다:

docker exec -it tinyllama1 ollama run tinyllama
docker exec -it tinyllama2 ollama run tinyllama
docker exec -it tinyllama3 ollama run tinyllama

이 작업은 한 번만 하면 됩니다 (모델 캐시됨)
시간이 오래 걸리지 않습니다 (~50MB)

## 테스트
curl http://localhost:4444/v1/chat/completions \
  -H "Authorization: Bearer localtestkey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tinyllama2",
    "messages": [{"role": "user", "content": "안녕!"}]
  }'
