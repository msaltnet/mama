import os
import pytest
from app.litellm_service import LiteLLMService

LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4444")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-4444")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_models_success():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = await service.get_models()
    assert isinstance(models, list)
    print(f"사용 가능한 모델 수: {len(models)}")
    if models:
        print(f"첫 번째 모델: {models[0]}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_models_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    with pytest.raises(Exception) as excinfo:
        await service.get_models()
    assert "LiteLLM 모델 리스트 조회 실패" in str(excinfo.value)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_generate_key_success():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo", "gpt-4"]
    user_id = "integration-test-user"
    key = await service.generate_key(models=models, user_id=user_id, metadata={"test": True})
    assert key.startswith("sk-")
    print(f"생성된 키: {key}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_generate_key_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    models = ["gpt-3.5-turbo"]
    with pytest.raises(Exception) as excinfo:
        await service.generate_key(models=models, user_id="fail-user")
    assert "LiteLLM Key 생성 실패" in str(excinfo.value)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_key_success():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key = await service.generate_key(models=models, user_id="delete-test-user", metadata={"test": True})
    assert key.startswith("sk-")
    await service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_key_fail_invalid_master_key():
    service = LiteLLMService(base_url=LITELLM_URL, master_key="sk-invalid")
    with pytest.raises(Exception) as excinfo:
        await service.delete_key("sk-nonexistent-key")
    assert "LiteLLM Key 삭제 실패" in str(excinfo.value)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_generate_key_with_alias_and_get_alias():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key_alias = "integration"
    key = await service.generate_key(models=models, user_id="alias-create-user", key_alias=key_alias)
    assert key.startswith("sk-")
    await service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_key_alias_lifecycle():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key_alias = "banana"
    key = await service.generate_key(models=models, user_id="alias-create-user", key_alias=key_alias)
    assert key.startswith("sk-")
    new_key_alias = "orange-2"
    await service.update_key_alias(key, new_key_alias)
    await service.delete_key(key)
    print(f"키 삭제 성공: {key}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_key_models_lifecycle():
    service = LiteLLMService(base_url=LITELLM_URL, master_key=LITELLM_MASTER_KEY)
    models = ["gpt-3.5-turbo"]
    key = await service.generate_key(models=models, user_id="model-update-user")
    assert key.startswith("sk-")
    new_models = ["gpt-4", "gpt-3.5-turbo"]
    await service.update_key_models(key, new_models)
    fetched_models = await service.get_key_models(key)
    assert set(fetched_models) == set(new_models)
    print(f"수정된 모델 리스트: {fetched_models}")
    await service.delete_key(key)
    print(f"키 삭제 성공: {key}")
