set -e

[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 1. 驗證服務端點與監聽狀態
if [ -n "$FRONTEND_URL" ]; then
    echo "正在執行 Post-check: 驗證服務狀態 (機制 4: 多次重複探針)..."
    
    # 定義驗證函數
    verify_endpoint() {
        local url=$1
        local name=$2
        local success_count=0
        local required_successes=3
        local max_attempts=10

        echo "開始驗證 $name ($url)..."
        for ((i=1; i<=max_attempts; i++)); do
            if curl -sf -o /dev/null "$url"; then
                ((success_count++))
                echo "  [嘗試 $i] ✅ 成功 ($success_count/$required_successes)"
                if [ "$success_count" -ge "$required_successes" ]; then
                    return 0
                fi
            else
                echo "  [嘗試 $i] ❌ 失敗 (重置計數)"
                success_count=0
            fi
            sleep 2
        done
        return 1
    }

    # 執行埠號監聽基本檢查
    lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null || (echo "❌ 服務未在埠號 $PORT 啟動" && exit 1)

    # 執行多次探針驗證
    verify_endpoint "http://localhost:$PORT/explorer/api/files" "本地 API" || exit 1
    verify_endpoint "$FRONTEND_URL" "對外前端入口" || exit 1

    # 檢查對外 API 路由
    if [ -n "$EXTERNAL_API_URL" ]; then
        echo "驗證對外 API 路由: $EXTERNAL_API_URL"
        curl -sf -o /dev/null "$EXTERNAL_API_URL/files"
    fi

    # 2. 驗證後端版本注入與路徑對齊
    if [ -n "$REACT_APP_GIT_SHA" ]; then
        echo "正在驗證後端 Git SHA 與路徑對齊..."
        VERSION_INFO=$(curl -sf "http://localhost:$PORT/explorer/api/version")
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
    GOOGLE_CHECK=$(curl -s "http://localhost:$PORT/explorer/api/files?mode=google")
    if echo "$GOOGLE_CHECK" | grep -q "error"; then
        echo "❌ Google Drive 連結失敗: $GOOGLE_CHECK"
        exit 1
    fi
    echo "✅ Google Drive 連結正常。"

    # 5. 驗證是否誤用 Mock Root (測試沙箱資料)
    echo "驗證資料來源安全性..."
    LOCAL_CHECK=$(curl -s "http://localhost:$PORT/explorer/api/files")
    if echo "$LOCAL_CHECK" | grep -qE "empty_folder|new_folder"; then
        echo "❌ 錯誤：後端正在讀取測試沙箱 (Mock Root) 資料！請檢查正式環境 .env 設定。"
        exit 1
    fi
    echo "✅ 資料來源驗證通過。"

    # 6. 驗證對外服務版本一致性 (偵測 Caddy 目錄不對齊或快取問題)
    echo "驗證對外服務版本一致性..."
    EXTERNAL_VERSION_INFO=$(curl -sf "$EXTERNAL_API_URL/version" || echo '{"gitSha":"failed"}')
    EXTERNAL_SHA=$(echo "$EXTERNAL_VERSION_INFO" | jq -r '.gitSha')
    
    if [ "$EXTERNAL_SHA" != "$REACT_APP_GIT_SHA" ]; then
        echo "❌ 錯誤：對外服務版本 ($EXTERNAL_SHA) 與剛部署的版本 ($REACT_APP_GIT_SHA) 不一致！"
        echo "這通常表示 Caddy 服務目錄與 EXPLORER_DEPLOY_TARGET 不對齊，或存在強大快取。"
        exit 1
    fi

    # 7. 驗證前端靜態檔案 Git SHA (偵測前端部署問題)
    echo "驗證前端靜態檔案 Git SHA..."
    # 嘗試從 asset-manifest.json 取得 main.js 路徑
    FE_JS_URL=$(curl -sf "$FRONTEND_URL/asset-manifest.json" | jq -r '.files["main.js"]' 2>/dev/null || echo "")
    if [ -n "$FE_JS_URL" ]; then
        # 移除 URL 中的基礎路徑前綴 (例如 /explorer/) 以便拼接
        FE_JS_REL_PATH=$(echo "$FE_JS_URL" | sed "s|^/explorer/||; s|^explorer/||")
        # 直接從前端 URL 獲取 JS 內容並搜尋 Git SHA
        FE_SHA=$(curl -sf "$FRONTEND_URL/$FE_JS_REL_PATH" | grep -oE "[0-9a-f]{7,40}" | grep "$REACT_APP_GIT_SHA" || echo "")
        
        if [ -z "$FE_SHA" ]; then
            # 如果沒找到預期的 SHA，抓取 JS 中看起來像 SHA 的字串來報錯
            ACTUAL_FE_SHA=$(curl -sf "$FRONTEND_URL/$FE_JS_REL_PATH" | grep -oE "[0-9a-f]{7,40}" | head -n 1)
            echo "❌ 錯誤：前端 JS 檔案內容中的 Git SHA ($ACTUAL_FE_SHA) 與預期 ($REACT_APP_GIT_SHA) 不符！"
            echo "這表示部署雖然更新了檔案，但 Caddy 服務的路徑可能指向了錯誤的目錄。"
            exit 1
        fi
    fi
    echo "✅ 前端靜態檔案驗證通過。"
fi

echo "Post-check 已完成。"
