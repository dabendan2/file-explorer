set -e

# 1. 執行部署前檢查
bash deploy/precheck.sh
[ -f .env ] && export $(grep -v '^#' .env | xargs)

# 2. 確保工作區乾淨，避免部署未受版本控制的變更
# [ -z "$(git status --porcelain)" ]

echo "開始部署 explorer..."
mkdir -p "$EXPLORER_DEPLOY_TARGET"

# 3. 建置前端靜態檔案並同步至目標部署目錄
export REACT_APP_GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
(cd frontend && REACT_APP_GIT_SHA="$REACT_APP_GIT_SHA" npm run build)
sudo rsync -av --delete "frontend/build/" "$EXPLORER_DEPLOY_TARGET"

# 4. 後端服務更新：清理舊程序、安裝依賴並重啟服務
echo "正在啟動後端服務..."
pgrep -f "backend/src/index.js" | xargs -r kill -9
(cd backend && npm install --silent)
nohup env PORT="$PORT" REACT_APP_GIT_SHA="$REACT_APP_GIT_SHA" node backend/src/index.js > backend/server.log 2>&1 &
sleep 3

# 5. 執行部署後端點與狀態驗證
bash deploy/postcheck.sh
