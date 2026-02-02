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
