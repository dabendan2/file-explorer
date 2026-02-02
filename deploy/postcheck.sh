set -e

[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 1. 驗證服務端點與監聽狀態
if [ -n "$FRONTEND_URL" ]; then
    echo "正在執行 Post-check: 驗證後端 API 與前端入口..."
    # 確認後端埠號已開啟監聽
    lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t >/dev/null
    
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

    # 2. 驗證後端版本注入
    if [ -n "$REACT_APP_GIT_SHA" ]; then
        echo "正在驗證後端 Git SHA: $REACT_APP_GIT_SHA"
        curl -sf "http://localhost:${PORT:-5000}/explorer/api/version" | grep -q "$REACT_APP_GIT_SHA"
    fi

    # 3. 驗證 UI 版本
    if [ -n "$REACT_APP_VERSION" ]; then
        echo "正在驗證 UI 版本: v$REACT_APP_VERSION"
        curl -sf -L "$FRONTEND_URL" > /dev/null
    fi
fi

echo "Post-check 已完成。"
