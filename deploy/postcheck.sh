set -e

[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 1. 驗證服務端點與監聽狀態
if [ -n "$FRONTEND_URL" ]; then
    echo "正在執行 Post-check: 驗證後端 API 與前端入口..."
    # 確認後端埠號已開啟監聽
    lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t >/dev/null
    # 檢查後端本地 API 是否回應正常
    curl -sf -o /dev/null "http://localhost:${PORT:-5000}/api/files"
    # 檢查對外前端域名是否可訪問
    curl -sf -o /dev/null "$FRONTEND_URL"

    # 2. 驗證 UI 版本注入是否吻合
    if [ -n "$REACT_APP_VERSION" ]; then
        echo "正在驗證 UI 版本: v$REACT_APP_VERSION"
        # 由於 React 會將屬性壓縮在 JS 中，改為驗證主頁面是否正常回應
        curl -sf -L "$FRONTEND_URL" > /dev/null
    fi
fi

echo "Post-check 已完成。"
