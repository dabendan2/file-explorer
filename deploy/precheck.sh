#!/bin/bash
# explorer/deploy/precheck.sh

# 1. 檢查檔案中是否含有 .env 內的硬編碼數值 (排除 .env 及 .gitignore 指定的檔案)
echo "正在執行 Pre-check: 檢查硬編碼變數..."
if [ -f .env ]; then
    ENV_VALUES=$(grep -v '^#' .env | grep '=' | cut -d'=' -f2- | grep -v '^$')
    for val in $ENV_VALUES; do
        val=$(echo $val | sed "s/['\"]//g")
        # 排除 5000 (常見埠號)、./build/ (常見路徑) 與 http://localhost:5000/api (測試端點)
        if [ -n "$val" ] && [ "$val" != "./build/" ] && [ "$val" != "5000" ] && [ "$val" != "http://localhost:5000/api" ]; then
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

# 3. 執行沙箱整合測試
echo "正在執行 Pre-check: 沙箱整合測試..."
# 啟動臨時後端進行測試
nohup node backend/src/index.js > backend/test-server.log 2>&1 &
TEST_PID=$!
sleep 2

# 驗證 API (Integration Check)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/files || echo "000")
kill $TEST_PID

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "沙箱整合測試通過。"
else
    echo "錯誤：沙箱整合測試失敗 (HTTP 狀態碼: $HTTP_STATUS)"
    exit 1
fi

echo "Pre-check 已通過。"
exit 0
