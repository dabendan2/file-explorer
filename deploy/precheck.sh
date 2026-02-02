#!/bin/bash
# explorer/deploy/precheck.sh

# 1. 檢查檔案中是否含有 .env 內的硬編碼數值 (僅遵從 .gitignore)
# 註解：敏感資訊如金鑰不能上傳到 git，禁止新增任何排除邏輯。
# 如果覺得非敏感訊息或應該例外處理，需要取得人類同意。
echo "正在執行 Pre-check: 檢查硬編碼變數..."
[ -f .env ] && grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$' | sed "s/['\"]//g" | while read -r val; do
    if [ -n "$val" ]; then
        FOUND=$(git grep -F "$val" -- . | head -n 10)
        if [ -n "$FOUND" ]; then
            echo "錯誤：發現硬編碼環境變數值 ['$val'] (僅顯示前10筆)："
            echo "$FOUND"
            echo "--------------------------------------------------------"
            echo "處理方式：請將硬編碼數值替換為 process.env 或環境變數調用。"
            echo "警告：敏感資訊如金鑰不能上傳到 git，禁止新增任何排除邏輯。"
            echo "如果覺得非敏感訊息或應該例外處理，需要取得人類同意。"
            echo "--------------------------------------------------------"
            exit 1
        fi
    fi
done || (echo "錯誤：.env 檔案不存在，無法進行硬編碼檢查。" && exit 1)

# 2. 執行單元測試
echo "正在執行 Pre-check: 前端單元測試..."
cd frontend && CI=true npm test && cd ..

# 3. 執行沙箱整合測試
echo "正在執行 Pre-check: 沙箱整合測試 (tests/sandbox/test.js)..."
node tests/sandbox/test.js || exit 1

echo "Pre-check 已通過。"
exit 0
