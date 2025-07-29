export interface User {
  user_id: string;
  organization?: string;
  key_value: string;
  extra_info?: string;
  created_at?: string;
  updated_at?: string;
  allowed_models: string[];
  allowed_services: string[];
}
