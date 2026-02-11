set -e

# 1. 執行部署前檢查
bash deploy/precheck.sh
[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 2. 確保工作區乾淨，避免部署未受版本控制的變更
# 排除 frontend/build 目錄，因為它是建置產物不應受 Git 管理
if [ -n "$(git status --porcelain | grep -v 'frontend/build/')" ]; then
    echo "❌ 錯誤：工作區尚有未提交的改動，請先 commit 再部署。"
    exit 1
fi

echo "開始部署 file-explorer..."
mkdir -p "$EXPLORER_DEPLOY_TARGET"

# 3. 建置前端靜態檔案並同步至目標部署目錄
export REACT_APP_GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "正在建置前端 (SHA: $REACT_APP_GIT_SHA)..."
(cd frontend && REACT_APP_GIT_SHA="$REACT_APP_GIT_SHA" npm run build)
sudo rsync -av --delete "frontend/build/" "$EXPLORER_DEPLOY_TARGET"

# 4. 後端服務更新：使用 PM2 管理
echo "正在更新後端服務 (PM2)..."
(cd backend && npm install --silent)

if command -v pm2 >/dev/null 2>&1; then
    # 檢查是否已有該名稱的進程
    if pm2 describe file-explorer-backend >/dev/null 2>&1; then
        echo "正在重啟 PM2 進程..."
        pm2 restart file-explorer-backend --update-env
    else
        echo "正在啟動新 PM2 進程..."
        (cd backend && pm2 start src/index.js --name "file-explorer-backend")
    fi
    pm2 save
else
    echo "⚠️ 找不到 PM2，回退至 nohup 啟動..."
    if [ -n "$PORT" ]; then
        lsof -t -i :"$PORT" | xargs -r kill -9
    fi
    pgrep -f "node.*backend/src/index.js" | xargs -r kill -9
    (cd backend && nohup node src/index.js >> ../backend.log 2>&1 &)
fi
sleep 3

# 5. 執行部署後端點與狀態驗證
bash deploy/postcheck.sh
