import os
import pytest
from app.litellm_service import LiteLLMService

LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4444")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-4444")

@pytest.mark.integration
def test_get_models_success():
    """
    실제 LiteLLM Proxy가 실행 중이어야 하며, 환경변수에 LITELLM_URL, LITELLM_MASTER_KEY가 올바르게 세팅되어 있어야 합니다.
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = service.get_models()
    assert isinstance(models, list)
    print(f"사용 가능한 모델 수: {len(models)}")
    if models:
        print(f"첫 번째 모델: {models[0]}")

@pytest.mark.integration
def test_get_models_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    with pytest.raises(Exception) as excinfo:
        service.get_models()
    assert "LiteLLM 모델 리스트 조회 실패" in str(excinfo.value)

@pytest.mark.integration
def test_generate_key_success():
    """
    실제 LiteLLM Proxy가 실행 중이어야 하며, 환경변수에 LITELLM_URL, LITELLM_MASTER_KEY가 올바르게 세팅되어 있어야 합니다.
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo", "gpt-4"]
    user_id = "integration-test-user"
    key = service.generate_key(models=models, user_id=user_id, metadata={"test": True})
    assert key.startswith("sk-")
    print(f"생성된 키: {key}")

@pytest.mark.integration
def test_generate_key_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    models = ["gpt-3.5-turbo"]
    with pytest.raises(Exception) as excinfo:
        service.generate_key(models=models, user_id="fail-user")
    assert "LiteLLM Key 생성 실패" in str(excinfo.value) 