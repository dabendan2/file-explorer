#!/bin/bash
# explorer/deploy/deploy.sh

# 載入環境變數
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "錯誤：.env 檔案不存在"
    exit 1
fi

# 檢查必要的環境變數是否存在
REQUIRED_VARS=("EXPLORER_BUILD_DIR" "EXPLORER_DEPLOY_TARGET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "錯誤：環境變數 $var 未定義"
        exit 1
    fi
done

SOURCE_DIR=${EXPLORER_BUILD_DIR}
TARGET_DIR=${EXPLORER_DEPLOY_TARGET}

# 檢查環境變數變更
echo "檢查 Git 狀態..."
if [ ! -z "$(git status --porcelain)" ]; then
    echo "錯誤：發現未提交的內容，請先提交或 stash 變更後再部署。"
    git status --short
    exit 1
fi
echo "Git 狀態檢查通過。"

echo "開始部署 explorer..."

# 檢查檔案中是否含有 .env 內的硬編碼數值 (排除 .env, .env.example, .git, deploy.sh 自己)
echo "檢查硬編碼變數中..."
ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$')
for val in $ENV_VALUES; do
    # 移除引號
    val=$(echo $val | sed "s/['\"]//g")
    
    # 搜尋專案檔案 (僅排除 .env)
    FOUND=$(grep -rF "$val" . --exclude=".env")
    if [ ! -z "$FOUND" ]; then
        echo "錯誤：在以下檔案中發現硬編碼的環境變數值 ['$val']，請使用變數取代："
        echo "$FOUND"
        exit 1
    fi
done
echo "檢查通過，無硬編碼數值。"

# 確保目錄存在
mkdir -p "$TARGET_DIR"

# 執行 React Build
npm run build

# 同步文件
if [ -d "$SOURCE_DIR" ]; then
    rsync -av --delete "$SOURCE_DIR" "$TARGET_DIR"
    echo "部署完成。目標：$TARGET_DIR"
else
    echo "錯誤：build 目錄不存在，請確認 build 是否成功。"
    exit 1
fi

# 檢查並重新啟動後端服務
echo "正在檢查後端服務..."
# 假設後端入口為 backend/src/index.js，使用 pm2 或直接用 node 啟動
# 此處實作通用檢查與清理邏輯

# 1. 清理殘留程序 (以檔案路徑關鍵字搜尋)
OLD_PIDS=$(pgrep -f "backend/src/index.js")
if [ ! -z "$OLD_PIDS" ]; then
    echo "發現殘留後端程序 (PIDs: $OLD_PIDS)，正在清理..."
    kill -9 $OLD_PIDS
    sleep 2
fi

# 2. 啟動後端服務
echo "正在啟動後端服務..."
nohup node ../backend/src/index.js > ../backend/server.log 2>&1 &
sleep 3

# 3. 驗證服務狀態 (假設監聽 5000 埠)
BACKEND_PORT=5000
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "後端服務已成功啟動於埠號 $BACKEND_PORT。"
    
    # 4. 使用 Curl 檢查部署端點
    echo "正在驗證 API 端點響應..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/files || echo "000")
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "API 驗證成功 (HTTP 200)。"
    else
        echo "錯誤：API 驗證失敗 (HTTP 狀態碼: $HTTP_STATUS)，請檢查服務邏輯。"
        exit 1
    fi

    # 5. 驗證前端入口
    echo "正在驗證前端入口 (${FRONTEND_URL})..."
    FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
    if [ "$FE_STATUS" -eq 200 ]; then
        echo "前端入口驗證成功 (HTTP 200)。"
    else
        echo "警告：前端入口驗證失敗 (HTTP 狀態碼: $FE_STATUS)，請確認 Nginx/Web Server 配置。"
        # 前端通常依賴外部 Web Server，此處可視需求決定是否 exit 1
    fi
else
    echo "錯誤：後端服務啟動失敗，請檢查 backend/server.log。"
    exit 1
fi
