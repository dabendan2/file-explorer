#!/bin/bash
# explorer/deploy/precheck.sh

# 1. 檢查檔案中是否含有 .env 內的硬編碼數值 (排除 .env 及 .gitignore 指定的檔案)
echo "正在執行 Pre-check: 檢查硬編碼變數..."
if [ -f .env ]; then
    ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$')
    for val in $ENV_VALUES; do
        val=$(echo $val | sed "s/['\"]//g")
        # 排除 5000 (常見埠號) 與 ./build/ (常見路徑) 在 node_modules 與 README 的誤報
        if [ -n "$val" ] && [ "$val" != "./build/" ] && [ "$val" != "5000" ]; then
            FOUND=$(git grep -F "$val" -- . ':!.env')
            if [ -n "$FOUND" ]; then
                echo "錯誤：在以下檔案中發現硬編碼的環境變數值 ['$val']，請使用變數取代："
                echo "$FOUND"
                exit 1
            fi
        fi
    done
else
    echo "警告：.env 不存在，跳過硬編碼檢查。"
fi

# 2. 執行單元測試
echo "正在執行 Pre-check: 前端單元測試..."
cd frontend && CI=true npm test && cd ..

echo "Pre-check 已通過。"
exit 0
