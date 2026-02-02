#!/bin/bash
set -e

# 1. 確保 .env 檔案存在並驗證必要部署變數
echo "正在執行 Pre-check: 檢查環境變數..."
[ -f .env ]

REQUIRED_VARS=("EXPLORER_DEPLOY_TARGET")
for var in "${REQUIRED_VARS[@]}"; do
    [ -n "$(grep "^$var=" .env | cut -d'=' -f2- | sed "s/['\"]//g")" ]
done

# --- 禁止修改：檢查硬編碼變數開始 ---
# 2. 遍歷 .env 內的所有值，確保專案中沒有任何檔案包含這些硬編碼敏感資訊
echo "正在執行 Pre-check: 檢查硬編碼變數..."
ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$' | sed "s/['\"]//g")

while read -r val; do
    [ -z "$val" ] && continue
    ! git grep -F "$val" -- . | head -n 1
done <<< "$ENV_VALUES"
# --- 禁止修改：檢查硬編碼變數結束 ---

# 3. 執行前端單元測試
echo "正在執行 Pre-check: 前端單元測試..."
(cd frontend && CI=true npm test)

# 4. 執行沙箱環境整合測試
echo "正在執行 Pre-check: 沙箱整合測試..."
node tests/sandbox/test.js

echo "Pre-check 已通過。"
