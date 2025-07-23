import os
import pytest
from app.litellm_service import LiteLLMService

LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-xxxx")

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