import os
import httpx
from typing import List, Optional, Dict, Any

# 환경변수 설정
LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-1234")
LITELLM_TIMEOUT = int(os.getenv("LITELLM_TIMEOUT", "10"))
LITELLM_MAX_RETRIES = int(os.getenv("LITELLM_MAX_RETRIES", "3"))
LITELLM_RETRY_DELAY = float(os.getenv("LITELLM_RETRY_DELAY", "1.0"))


class LiteLLMService:
    def __init__(self, base_url: Optional[str] = None, master_key: Optional[str] = None):
        self.base_url = base_url or LITELLM_URL
        self.master_key = master_key or LITELLM_MASTER_KEY
        self.timeout = LITELLM_TIMEOUT
        self.max_retries = LITELLM_MAX_RETRIES
        self.retry_delay = LITELLM_RETRY_DELAY

    async def _make_request(
        self, method: str, url: str, headers: dict, json_data: Optional[dict] = None
    ) -> httpx.Response:
        """
        HTTP 요청을 수행하는 공통 메서드
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            if method.upper() == "GET":
                resp = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                resp = await client.post(url, headers=headers, json=json_data)
            else:
                raise ValueError(f"지원하지 않는 HTTP 메서드: {method}")
            return resp

    async def get_models(self) -> List[Dict[str, Any]]:
        """
        LiteLLM에서 사용 가능한 모델 리스트를 가져옵니다.
        :return: 모델 정보 리스트
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/models"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        resp = await self._make_request("GET", url, headers)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM 모델 리스트 조회 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        return data.get("data", [])

    async def generate_key(
        self,
        models: List[str],
        user_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        key_alias: Optional[str] = None,
    ) -> str:
        """
        LiteLLM Key 생성
        :param models: 허용할 모델 리스트 (예: ["gpt-3.5-turbo", "gpt-4"])
        :param user_id: 연결할 user_id (선택)
        :param metadata: 추가 메타데이터 (선택)
        :param key_alias: key의 별칭(선택)
        :return: 생성된 key(str)
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/key/generate"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        payload = {"models": models}
        if user_id:
            payload["user_id"] = user_id
        if metadata:
            payload["metadata"] = metadata
        if key_alias:
            payload["key_alias"] = key_alias
        resp = await self._make_request("POST", url, headers, payload)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 생성 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        key = data.get("key") or data.get("token")
        if not key:
            raise Exception(f"LiteLLM Key 응답에 key 없음: {data}")
        return key

    async def delete_key(self, key: str) -> None:
        """
        LiteLLM Key 삭제
        :param key: 삭제할 key(str)
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/key/delete"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        payload = {"keys": [key]}  # LiteLLM은 'keys' 리스트를 요구함
        resp = await self._make_request("POST", url, headers, payload)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 삭제 실패: {resp.status_code} {resp.text}")
        # 성공 시 별도 반환값 없음

    async def update_key_alias(self, key: str, key_alias: str) -> None:
        """
        LiteLLM Key의 key alias(별칭) 수정
        :param key: 수정할 key(str)
        :param key_alias: 변경할 key alias(str)
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/key/update"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        payload = {"key": key, "key_alias": key_alias}
        resp = await self._make_request("POST", url, headers, payload)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key alias 수정 실패: {resp.status_code} {resp.text}")
        # 성공 시 별도 반환값 없음

    async def update_key_models(self, key: str, models: list) -> None:
        """
        LiteLLM Key의 사용 가능 모델 리스트(models) 수정
        :param key: 수정할 key(str)
        :param models: 변경할 모델 리스트(list)
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/key/update"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        payload = {"key": key, "models": models}
        resp = await self._make_request("POST", url, headers, payload)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 모델 수정 실패: {resp.status_code} {resp.text}")
        # 성공 시 별도 반환값 없음

    async def get_key_models(self, key: str) -> Optional[list]:
        """
        LiteLLM Key로 사용 가능한 모델 리스트 조회
        :param key: 조회할 key(str)
        :return: models(list) 또는 None
        :raises: Exception (API 실패 시)
        """
        url = f"{self.base_url}/key/info?key={key}"
        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        resp = await self._make_request("GET", url, headers)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 모델 조회 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        return data.get("info", {}).get("models")
