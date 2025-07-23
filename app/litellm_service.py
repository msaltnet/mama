import os
import requests
from typing import List, Optional

LITELLM_URL = os.getenv("LITELLM_URL", "http://localhost:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-1234")

class LiteLLMService:
    def __init__(self, base_url: Optional[str] = None, master_key: Optional[str] = None):
        self.base_url = base_url or LITELLM_URL
        self.master_key = master_key or LITELLM_MASTER_KEY

    def generate_key(self, models: List[str], user_id: Optional[str] = None, metadata: Optional[dict] = None) -> str:
        """
        LiteLLM Key 생성
        :param models: 허용할 모델 리스트 (예: ["gpt-3.5-turbo", "gpt-4"])
        :param user_id: 연결할 user_id (선택)
        :param metadata: 추가 메타데이터 (선택)
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
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"LiteLLM Key 생성 실패: {resp.status_code} {resp.text}")
        data = resp.json()
        # 실제 반환 구조에 따라 key 추출
        key = data.get("key") or data.get("token")
        if not key:
            raise Exception(f"LiteLLM Key 응답에 key 없음: {data}")
        return key 