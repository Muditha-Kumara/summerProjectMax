# Rendered by Terraform on the Azure demo server — do not edit manually.
# Same as infra/templates/env.tpl plus PRICE_SOURCE / USE_VIRTUAL_SHELLY.
# PostgreSQL Database
POSTGRES_USER=${db_user}
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=${db_name}

# Backend
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}

# Shelly Cloud API
SHELLY_CLOUD_API_URL=${shelly_cloud_api_url}
SHELLY_AUTH_KEY=${shelly_auth_key}
SHELLY_SERVER_ID=${shelly_server_id}
USE_VIRTUAL_SHELLY=${use_virtual_shelly}

# Nord Pool / spot prices
NORD_POOL_API_URL=${nord_pool_api_url}
NORD_POOL_AREA=${nord_pool_area}
USE_MOCK_PRICES=${use_mock_prices}
PRICE_SOURCE=${price_source}

# OpenWeatherMap API
OPENWEATHER_API_KEY=${openweather_api_key}

# Email Configuration
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_SECURE=false
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
SMTP_FROM=${smtp_from}

# AI API (DashScope / Qwen)
OPENAI_API_KEY=${ai_api_key}
AI_MODEL=${ai_model}
AI_ENDPOINT=${ai_endpoint}

# Frontend
FRONTEND_URL=${frontend_url}
VITE_API_URL=/api/v1
