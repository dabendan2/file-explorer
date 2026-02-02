#!/bin/bash
# explorer/scripts/deploy.sh
# 部署 explorer 至 openclaw-web/public/explorer

SOURCE_DIR="./build/"
TARGET_DIR="../openclaw-web/public/explorer/"

echo "開始部署 explorer..."

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
