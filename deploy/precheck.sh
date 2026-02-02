#!/bin/bash
# explorer/deploy/precheck.sh

# 1. 檢查檔案中是否含有 .env 內的硬編碼數值 (僅遵從 .gitignore)
# 註解：敏感資訊如金鑰不能上傳到 git，禁止新增任何排除邏輯。
# 如果覺得非敏感訊息或應該例外處理，需要取得人類同意。
echo "正在執行 Pre-check: 檢查硬編碼變數..."

# 確保在迴圈中發現錯誤時能正確退出
FAILED=0

if [ -f .env ]; then
    # 讀取 .env 中的值，移除引號並過濾空行與註解
    ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$' | sed "s/['\"]//g")
    
    while read -r val; do
        if [ -n "$val" ]; then
            # 使用 git grep 搜尋。git grep 會自動讀取 .gitignore。
            # 我們必須檢查整個工作區（包含未暫存但已追蹤的改動）
            FOUND=$(git grep -F "$val" -- . | head -n 10)
            if [ -n "$FOUND" ]; then
                echo "錯誤：發現硬編碼環境變數值 ['$val'] (僅顯示前10筆)："
                echo "$FOUND"
                echo "--------------------------------------------------------"
                echo "處理方式：請將硬編碼數值替換為 process.env 或環境變數調用。"
                echo "警告：敏感資訊如金鑰不能上傳到 git，禁止新增任何排除邏輯。"
                echo "如果覺得非敏感訊息或應該例外處理，需要取得人類同意。"
                echo "--------------------------------------------------------"
                FAILED=1
            fi
        fi
    done <<< "$ENV_VALUES"
else
    echo "錯誤：.env 檔案不存在，無法進行硬編碼檢查。"
    exit 1
fi

if [ $FAILED -eq 1 ]; then
    exit 1
fi

# 2. 執行單元測試
echo "正在執行 Pre-check: 前端單元測試..."
cd frontend && CI=true npm test && cd ..

# 3. 執行沙箱整合測試
echo "正在執行 Pre-check: 沙箱整合測試 (tests/sandbox/test.js)..."
node tests/sandbox/test.js || exit 1

echo "Pre-check 已通過。"
exit 0
