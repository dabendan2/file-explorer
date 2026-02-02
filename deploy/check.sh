#!/bin/bash
# explorer/deploy/check.sh

# 1. 檢查檔案中是否含有 .env 內的硬編碼數值 (排除 .env 及 .gitignore 指定的檔案)
echo "檢查硬編碼變數中..."
if [ -f .env ]; then
    ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$')
    for val in $ENV_VALUES; do
        val=$(echo $val | sed "s/['\"]//g")
        # 排除常見路徑、埠號以及 node_modules/package.json 等誤報
        if [ -n "$val" ] && [ "$val" != "build/" ] && [ "$val" != "5000" ] && [ "$val" != "3000" ] && [ "$val" != "./build/" ]; then
            # 僅針對 src 目錄或非 node_modules 目錄進行檢查，並排除 check.sh 自己及 .env.example
            FOUND=$(git grep -F "$val" -- . ':!.env' ':!.env.example' ':!deploy/check.sh' ':!*.md' ':!package.json' ':!package-lock.json' ':!node_modules')
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
echo "正在執行前端單元測試..."
cd frontend && CI=true npm test && cd ..

# 3. 執行整合測試
echo "正在執行整合測試..."
# 啟動臨時後端進行測試
nohup node backend/src/index.js > backend/test-server.log 2>&1 &
TEST_PID=$!
sleep 2

# 驗證 API (Integration Check)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/files || echo "000")
kill $TEST_PID

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "整合測試通過。"
else
    echo "錯誤：整合測試失敗 (HTTP 狀態碼: $HTTP_STATUS)"
    exit 1
fi

echo "所有檢查與測試已通過。"
exit 0
