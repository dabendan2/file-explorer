#!/bin/bash
set -e

# 1. 驗證 .env 檔案存在且所有變數皆有值
echo "正在執行 Pre-check: 檢查環境變數..."
if [ ! -f .env ]; then
    echo "❌ 錯誤：找不到 .env 檔案。"
    exit 1
fi

# 讀取所有非註解行，並驗證其值不為空
while read -r line || [ -n "$line" ]; do
    var_name=$(echo "$line" | cut -d'=' -f1)
    var_value=$(echo "$line" | cut -d'=' -f2-)
    if [ -z "$var_value" ]; then
        echo "❌ 錯誤：變數 $var_name 在 .env 中未定義值。"
        exit 1
    fi
done <<< "$(grep -v '^#' .env | grep '=')"

# 2. 遍歷 .env 內的所有值，確保專案中沒有任何檔案包含這些硬編碼敏感資訊
echo "正在執行 Pre-check: 檢查硬編碼變數..."
# 排除 .env 本身、排除註解行、排除空值、移除引號
ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$' | sed "s/['\"]//g")

while read -r val; do
    [ -z "$val" ] && continue
    # 使用原生 grep 進行全文字檢查，排除 .env, 排除 node_modules, 排除 .git, 排除 .env.example
    # 若發現匹配則輸出檔案路徑並終止
    if grep -rF "$val" . --exclude=".env" --exclude=".env.example" --exclude-dir="node_modules" --exclude-dir=".git" --exclude-dir="logs" --exclude-dir="build" | grep -q .; then
        echo "❌ 錯誤：偵測到硬編碼敏感資訊 \"$val\" 存在於以下檔案中："
        grep -rF "$val" . --exclude=".env" --exclude=".env.example" --exclude-dir="node_modules" --exclude-dir=".git" --exclude-dir="logs" --exclude-dir="build"
        exit 1
    fi
done <<< "$ENV_VALUES"
# --- 禁止修改：檢查硬編碼變數結束 ---

# 2.5 確保 build 產物不進入版本控制 (若有誤入則清理)
git rm -r --cached backend/static/ 2>/dev/null || true

# 3. 執行前端單元測試
echo "正在執行 Pre-check: 前端單元測試..."
(cd frontend && CI=true npm test)

# 4. 執行沙箱環境整合測試 (複寫 EXPLORER_DATA_ROOT 為空以使用 Mock Root)
echo "正在執行 Pre-check: 沙箱整合測試..."
git restore backend/version.txt || true
EXPLORER_DATA_ROOT="" node tests/sandbox/test.js
EXPLORER_DATA_ROOT="" node tests/sandbox/test_content.js

echo "Pre-check 已通過。"
