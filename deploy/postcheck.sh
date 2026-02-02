#!/bin/bash
# explorer/deploy/postcheck.sh

# 載入環境變數以取得 FRONTEND_URL
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=5000

# 1. 整合測試 (API 驗證)
echo "正在執行 Post-check: 整合測試 (API)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/files || echo "000")
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "API 整合測試通過。"
else
    echo "錯誤：API 整合測試失敗 (HTTP 狀態碼: $HTTP_STATUS)"
    exit 1
fi

# 2. 前端入口驗證
if [ -n "$FRONTEND_URL" ]; then
    echo "正在執行 Post-check: 前端入口驗證 ($FRONTEND_URL)..."
    FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
    if [ "$FE_STATUS" -eq 200 ]; then
        echo "前端入口驗證成功。"
    else
        echo "警告：前端入口驗證失敗 (HTTP 狀態碼: $FE_STATUS)"
    fi
fi

echo "Post-check 已完成。"
exit 0
