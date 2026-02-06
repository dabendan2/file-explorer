set -e

[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 1. 驗證服務端點與監聽狀態
if [ -n "$FRONTEND_URL" ]; then
    echo "正在執行 Post-check: 驗證後端 API 與前端入口..."
    # 確認後端埠號已開啟監聽
    for i in {1..5}; do
        if lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t >/dev/null; then
            break
        fi
        echo "等待後端服務啟動... ($i/5)"
        sleep 2
    done
    lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t >/dev/null || (echo "❌ 後端服務未在埠號 ${PORT:-5000} 啟動" && exit 1)
    
    # 檢查後端本地 API (注意：後端路由現在包含 /explorer/api)
    echo "驗證本地 API..."
    curl -sf -o /dev/null "http://localhost:${PORT:-5000}/explorer/api/files"
    
    # 檢查對外前端域名
    echo "驗證對外前端入口..."
    curl -sf -o /dev/null "$FRONTEND_URL"

    # 檢查對外 API 路由
    if [ -n "$EXTERNAL_API_URL" ]; then
        echo "驗證對外 API 路由: $EXTERNAL_API_URL"
        curl -sf -o /dev/null "$EXTERNAL_API_URL/files"
    fi

    # 2. 驗證後端版本注入與路徑對齊
    if [ -n "$REACT_APP_GIT_SHA" ]; then
        echo "正在驗證後端 Git SHA 與路徑對齊..."
        VERSION_INFO=$(curl -sf "http://localhost:${PORT:-5000}/explorer/api/version")
        # 檢查 Git SHA
        echo "$VERSION_INFO" | grep -q "$REACT_APP_GIT_SHA"
        # 檢查路徑對齊 (確認後端實際使用的路徑與 .env 一致)
        EXPECTED_ROOT=$(grep "^EXPLORER_DATA_ROOT=" .env | cut -d'=' -f2- | sed "s/['\"]//g")
        if [ -n "$EXPECTED_ROOT" ]; then
            ACTUAL_ROOT=$(echo "$VERSION_INFO" | jq -r '.dataRoot')
            if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT" ]; then
                echo "❌ 錯誤：路徑不對齊！預期: $EXPECTED_ROOT，實際: $ACTUAL_ROOT"
                exit 1
            fi
        fi
        echo "✅ 版本與路徑驗證通過。"
    fi

    # 3. 驗證 Google Drive 連結
    echo "驗證 Google Drive 連結..."
    GOOGLE_CHECK=$(curl -s "http://localhost:${PORT:-5000}/explorer/api/files?mode=google")
    if echo "$GOOGLE_CHECK" | grep -q "error"; then
        echo "❌ Google Drive 連結失敗: $GOOGLE_CHECK"
        exit 1
    fi
    echo "✅ Google Drive 連結正常。"

    # 5. 驗證是否誤用 Mock Root (測試沙箱資料)
    echo "驗證資料來源安全性..."
    LOCAL_CHECK=$(curl -s "http://localhost:${PORT:-5000}/explorer/api/files")
    if echo "$LOCAL_CHECK" | grep -qE "empty_folder|new_folder"; then
        echo "❌ 錯誤：後端正在讀取測試沙箱 (Mock Root) 資料！請檢查正式環境 .env 設定。"
        exit 1
    fi
    echo "✅ 資料來源驗證通過。"
fi

echo "Post-check 已完成。"
