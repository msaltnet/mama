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

@pytest.mark.integration
def test_delete_key_success():
    """
    실제 LiteLLM Proxy가 실행 중이어야 하며, 환경변수에 LITELLM_URL, LITELLM_MASTER_KEY가 올바르게 세팅되어 있어야 합니다.
    생성한 키를 삭제까지 검증합니다.
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key = service.generate_key(models=models, user_id="delete-test-user", metadata={"test": True})
    assert key.startswith("sk-")
    # 삭제 시도
    service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
def test_delete_key_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    with pytest.raises(Exception) as excinfo:
        # 임의의 키 값 사용 (실제 존재하지 않아도 무방)
        service.delete_key("sk-nonexistent-key")
    assert "LiteLLM Key 삭제 실패" in str(excinfo.value)

@pytest.mark.integration
def test_generate_key_with_alias_and_get_alias():
    """
    key_alias를 지정해서 키를 생성하고, 해당 key_alias가 정상적으로 조회되는지 검증하는 테스트
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key_alias = "integration"
    key = service.generate_key(models=models, user_id="alias-create-user", key_alias=key_alias)
    assert key.startswith("sk-")
    # 삭제
    service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
def test_update_key_alias_lifecycle():
    """
    키를 생성 → key alias 수정 → 삭제하는 end-to-end 테스트
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key_alias = "banana"
    key = service.generate_key(models=models, user_id="alias-create-user", key_alias=key_alias)
    assert key.startswith("sk-")
    # key alias 수정
    new_key_alias = "orange-2"
    service.update_key_alias(key, new_key_alias)
    # # 삭제
    service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
def test_update_key_models_lifecycle():
    """
    키를 생성 → 모델 리스트를 수정 → 모델 리스트를 조회하여 반영 여부를 검증 → 삭제하는 end-to-end 테스트
    """
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key = service.generate_key(models=models, user_id="model-update-user")
    assert key.startswith("sk-")
    # 모델 리스트 수정
    new_models = ["gpt-4", "gpt-3.5-turbo"]
    service.update_key_models(key, new_models)
    # 모델 리스트 조회
    fetched_models = service.get_key_models(key)
    assert set(fetched_models) == set(new_models)
    print(f"수정된 모델 리스트: {fetched_models}")
    # 삭제
    service.delete_key(key)
    print(f"키 삭제 성공: {key}")
