import os
import requests
from typing import List, Optional, Dict, Any

LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-1234")

class LiteLLMService:
    def __init__(self, base_url: Optional[str] = None, master_key: Optional[str] = None):
        self.base_url = base_url or LITELLM_URL
        self.master_key = master_key or LITELLM_MASTER_KEY

    def get_models(self) -> List[Dict[str, Any]]:
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
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM 모델 리스트 조회 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        return data.get("data", [])

    def generate_key(self, models: List[str], user_id: Optional[str] = None, metadata: Optional[dict] = None, key_alias: Optional[str] = None) -> str:
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
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 생성 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        # 실제 반환 구조에 따라 key 추출
        key = data.get("key") or data.get("token")
        if not key:
            raise Exception(f"LiteLLM Key 응답에 key 없음: {data}")
        return key

    def delete_key(self, key: str) -> None:
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
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 삭제 실패: {resp.status_code} {resp.text}")
        # 성공 시 별도 반환값 없음

    def update_key_alias(self, key: str, key_alias: str) -> None:
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
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key alias 수정 실패: {resp.status_code} {resp.text}")
        # 성공 시 별도 반환값 없음
