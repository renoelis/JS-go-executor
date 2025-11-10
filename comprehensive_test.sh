#!/bin/bash

# Flow-codeblock 全方位功能测试脚本
# 基于官方文档编写,覆盖所有已实现功能

# 测试配置
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_test_token_unlimited_access_12345678"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 打印分隔线
print_separator() {
    echo ""
    echo "=========================================================================================================="
    echo ""
}

# 打印测试标题
print_test_title() {
    local title=$1
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}测试 #${TOTAL_TESTS}: ${title}${NC}"
    echo "---"
}

# 执行测试
run_test() {
    local test_name=$1
    local code=$2
    local input=$3
    
    print_test_title "$test_name"
    
    # Base64编码代码
    CODE_BASE64=$(echo -n "$code" | base64)
    
    # 发送请求
    echo "发送请求..."
    RESPONSE=$(curl -s -w "\n%{http_code}" --location "$API_URL" \
        --header "Content-Type: application/json" \
        --header "accessToken: $ACCESS_TOKEN" \
        --data "{
            \"input\": $input,
            \"codebase64\": \"$CODE_BASE64\"
        }")
    
    # 分离响应体和状态码
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')
    
    # 打印响应
    echo ""
    echo "HTTP状态码: $HTTP_CODE"
    echo ""
    echo "响应内容:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
    
    # 检查是否成功
    if [ "$HTTP_CODE" = "200" ]; then
        SUCCESS=$(echo "$RESPONSE_BODY" | grep -o '"success"[[:space:]]*:[[:space:]]*true' | head -1)
        if [ -n "$SUCCESS" ]; then
            echo ""
            echo -e "${GREEN}✅ 测试通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo ""
            echo -e "${RED}❌ 测试失败: 执行返回失败${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo ""
        echo -e "${RED}❌ 测试失败: HTTP状态码 $HTTP_CODE${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    print_separator
}

# 开始测试
echo -e "${YELLOW}"
echo "╔════════════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                                    ║"
echo "║              Flow-codeblock 全方位功能测试                                          ║"
echo "║              Comprehensive Feature Test Suite                                      ║"
echo "║                                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "测试服务器: $API_URL"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""
print_separator

# ============================================================
# 分类 1: 基础计算和数据处理
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 1: 基础计算和数据处理${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试1: 简单计算
run_test "简单数学计算" \
'return {
  sum: input.a + input.b,
  product: input.a * input.b,
  average: (input.a + input.b) / 2,
  message: `计算完成: ${input.a} + ${input.b} = ${input.a + input.b}`
};' \
'{"a": 10, "b": 20}'

# 测试2: 数组操作
run_test "数组数据处理" \
'const numbers = input.numbers;
return {
  sum: numbers.reduce((a, b) => a + b, 0),
  average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
  max: Math.max(...numbers),
  min: Math.min(...numbers),
  count: numbers.length
};' \
'{"numbers": [10, 20, 30, 40, 50]}'

# 测试3: 对象数组处理
run_test "对象数组过滤和映射" \
'const users = input.users;
const adults = users.filter(u => u.age >= 18);
const names = users.map(u => u.name);
const totalAge = users.reduce((sum, u) => sum + u.age, 0);

return {
  total: users.length,
  adults: adults.length,
  names: names,
  averageAge: totalAge / users.length,
  adultUsers: adults
};' \
'{
  "users": [
    {"name": "张三", "age": 25},
    {"name": "李四", "age": 17},
    {"name": "王五", "age": 30},
    {"name": "赵六", "age": 16}
  ]
}'

# 测试4: 字符串处理
run_test "字符串操作和模板" \
'const text = input.text;
return {
  uppercase: text.toUpperCase(),
  lowercase: text.toLowerCase(),
  length: text.length,
  reversed: text.split("").reverse().join(""),
  words: text.split(" "),
  wordCount: text.split(" ").length
};' \
'{"text": "Hello World From Flow CodeBlock"}'

# ============================================================
# 分类 2: HTTP 请求功能 (Fetch API)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 2: HTTP 请求功能 (Fetch API)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试5: Fetch GET 请求
run_test "Fetch GET 请求获取数据" \
'async function main() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await response.json();
    
    return {
      success: true,
      statusCode: response.status,
      statusText: response.statusText,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{}'

# 测试6: Fetch POST 请求
run_test "Fetch POST 请求提交数据" \
'async function main() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        userId: input.userId
      })
    });
    
    const data = await response.json();
    
    return {
      success: true,
      created: true,
      postId: data.id,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{
  "title": "测试文章标题",
  "body": "这是一篇测试文章的内容",
  "userId": 1
}'

# 测试7: 多个接口串联调用
run_test "多个API依次调用" \
'async function main() {
  try {
    // 步骤1: 获取用户信息
    const userResponse = await fetch("https://jsonplaceholder.typicode.com/users/1");
    const user = await userResponse.json();
    
    // 步骤2: 获取用户的文章
    const postsResponse = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
    const posts = await postsResponse.json();
    
    // 步骤3: 获取第一篇文章的评论
    if (posts.length > 0) {
      const commentsResponse = await fetch(`https://jsonplaceholder.typicode.com/comments?postId=${posts[0].id}`);
      const comments = await commentsResponse.json();
      
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        postCount: posts.length,
        firstPost: {
          id: posts[0].id,
          title: posts[0].title
        },
        commentCount: comments.length
      };
    }
    
    return {
      success: true,
      user: user,
      postCount: posts.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{}'

# ============================================================
# 分类 3: HTTP 请求功能 (Axios)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 3: HTTP 请求功能 (Axios)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试8: Axios GET 请求
run_test "Axios GET 请求" \
'const axios = require("axios");

async function main() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/users/1");
    
    return {
      success: true,
      statusCode: response.status,
      user: {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        city: response.data.address.city
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{}'

# 测试9: Axios POST 请求
run_test "Axios POST 请求" \
'const axios = require("axios");

async function main() {
  try {
    const response = await axios.post("https://jsonplaceholder.typicode.com/posts", {
      title: input.title,
      body: input.body,
      userId: input.userId
    });
    
    return {
      success: true,
      postId: response.data.id,
      title: response.data.title
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{
  "title": "Axios测试文章",
  "body": "使用Axios发送POST请求",
  "userId": 1
}'

# 测试10: Axios 并发请求
run_test "Axios 并发请求 (Promise.all)" \
'const axios = require("axios");

async function main() {
  try {
    const [user1, user2, user3] = await Promise.all([
      axios.get("https://jsonplaceholder.typicode.com/users/1"),
      axios.get("https://jsonplaceholder.typicode.com/users/2"),
      axios.get("https://jsonplaceholder.typicode.com/users/3")
    ]);
    
    return {
      success: true,
      users: [
        { id: user1.data.id, name: user1.data.name },
        { id: user2.data.id, name: user2.data.name },
        { id: user3.data.id, name: user3.data.name }
      ],
      count: 3
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();' \
'{}'

# ============================================================
# 分类 4: Lodash 数据处理
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 4: Lodash 数据处理${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试11: Lodash 分组和统计
run_test "Lodash 数据分组和统计" \
'const _ = require("lodash");

const users = input.users;

// 按年龄分组
const groupedByAge = _.groupBy(users, "age");

// 计算平均年龄
const avgAge = _.meanBy(users, "age");

// 过滤活跃用户
const activeUsers = _.filter(users, { isActive: true });

// 按年龄排序
const sortedByAge = _.sortBy(users, ["age", "name"]);

return {
  success: true,
  total: users.length,
  groupedByAge: groupedByAge,
  averageAge: avgAge,
  activeCount: activeUsers.length,
  sorted: sortedByAge
};' \
'{
  "users": [
    {"name": "张三", "age": 25, "isActive": true},
    {"name": "李四", "age": 30, "isActive": false},
    {"name": "王五", "age": 25, "isActive": true},
    {"name": "赵六", "age": 30, "isActive": true}
  ]
}'

# 测试12: Lodash 数组操作
run_test "Lodash 数组去重、合并、差集" \
'const _ = require("lodash");

const arr1 = input.array1;
const arr2 = input.array2;

return {
  success: true,
  union: _.union(arr1, arr2),           // 并集
  intersection: _.intersection(arr1, arr2), // 交集
  difference: _.difference(arr1, arr2),    // 差集
  uniqArr1: _.uniq(arr1),                  // 去重
  chunk: _.chunk(arr1, 2)                  // 分块
};' \
'{
  "array1": [1, 2, 2, 3, 4, 5],
  "array2": [3, 4, 5, 6, 7]
}'

# 测试13: Lodash 对象操作
run_test "Lodash 对象处理和深拷贝" \
'const _ = require("lodash");

const obj = input.object;

// 深拷贝
const cloned = _.cloneDeep(obj);

// 提取值
const values = _.values(obj);

// 提取键
const keys = _.keys(obj);

// Pick特定字段
const picked = _.pick(obj, ["name", "age"]);

// Omit特定字段
const omitted = _.omit(obj, ["password"]);

return {
  success: true,
  original: obj,
  cloned: cloned,
  values: values,
  keys: keys,
  picked: picked,
  omitted: omitted
};' \
'{
  "object": {
    "name": "张三",
    "age": 25,
    "email": "zhang@example.com",
    "password": "secret123"
  }
}'

# ============================================================
# 分类 5: 加密和哈希 (Crypto)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 5: 加密和哈希 (Crypto)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试14: SHA256 哈希
run_test "SHA256 哈希计算" \
'const crypto = require("crypto");

const text = input.text;

// SHA256
const sha256 = crypto.createHash("sha256").update(text).digest("hex");

// SHA512
const sha512 = crypto.createHash("sha512").update(text).digest("hex");

// MD5
const md5 = crypto.createHash("md5").update(text).digest("hex");

return {
  success: true,
  original: text,
  sha256: sha256,
  sha512: sha512,
  md5: md5
};' \
'{"text": "Hello World"}'

# 测试15: HMAC 签名
run_test "HMAC 签名验证" \
'const crypto = require("crypto");

const data = input.data;
const secret = input.secret;

// HMAC-SHA256
const hmac256 = crypto.createHmac("sha256", secret).update(data).digest("hex");

// HMAC-SHA512
const hmac512 = crypto.createHmac("sha512", secret).update(data).digest("hex");

return {
  success: true,
  data: data,
  hmac_sha256: hmac256,
  hmac_sha512: hmac512
};' \
'{
  "data": "important message",
  "secret": "my-secret-key-12345"
}'

# 测试16: Base64 编解码
run_test "Base64 编码和解码" \
'const text = input.text;

// 编码
const encoded = Buffer.from(text).toString("base64");

// 解码
const decoded = Buffer.from(encoded, "base64").toString("utf-8");

// 验证
const isValid = text === decoded;

return {
  success: true,
  original: text,
  encoded: encoded,
  decoded: decoded,
  isValid: isValid
};' \
'{"text": "Hello World! 你好世界！"}'

# ============================================================
# 分类 6: 日期处理 (date-fns)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 6: 日期处理 (date-fns)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试17: 日期格式化和计算
run_test "日期格式化和日期计算" \
'const dateFns = require("date-fns");

const now = new Date();
const targetDate = new Date(input.targetDate);

// 格式化
const formatted = dateFns.format(now, "yyyy-MM-dd HH:mm:ss");

// 增加天数
const after7Days = dateFns.addDays(now, 7);

// 减少天数
const before7Days = dateFns.subDays(now, 7);

// 日期差异
const daysDiff = dateFns.differenceInDays(targetDate, now);

return {
  success: true,
  now: formatted,
  after7Days: dateFns.format(after7Days, "yyyy-MM-dd"),
  before7Days: dateFns.format(before7Days, "yyyy-MM-dd"),
  targetDate: input.targetDate,
  daysUntilTarget: daysDiff
};' \
'{"targetDate": "2025-12-31"}'

# 测试18: 日期比较和验证
run_test "日期比较和有效性验证" \
'const dateFns = require("date-fns");

const date1 = new Date(input.date1);
const date2 = new Date(input.date2);

// 比较
const isBefore = dateFns.isBefore(date1, date2);
const isAfter = dateFns.isAfter(date1, date2);
const isEqual = dateFns.isEqual(date1, date2);

// 是否同一天
const isSameDay = dateFns.isSameDay(date1, date2);

// 是否周末
const isWeekend1 = dateFns.isWeekend(date1);

return {
  success: true,
  date1: input.date1,
  date2: input.date2,
  isBefore: isBefore,
  isAfter: isAfter,
  isEqual: isEqual,
  isSameDay: isSameDay,
  date1IsWeekend: isWeekend1
};' \
'{
  "date1": "2025-10-11",
  "date2": "2025-12-31"
}'

# ============================================================
# 分类 7: UUID 生成
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 7: UUID 生成${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试19: UUID v4 生成
run_test "UUID v4 随机生成" \
'const uuid = require("uuid");

const uuids = [];
for (let i = 0; i < 5; i++) {
  uuids.push(uuid.v4());
}

return {
  success: true,
  count: uuids.length,
  uuids: uuids
};' \
'{}'

# ============================================================
# 分类 8: 查询字符串处理 (qs)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 8: 查询字符串处理 (qs)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试20: 查询字符串解析和序列化
run_test "URL 查询字符串解析和序列化" \
'const qs = require("qs");

const queryString = input.queryString;
const object = input.object;

// 解析查询字符串
const parsed = qs.parse(queryString);

// 对象转查询字符串
const stringified = qs.stringify(object);

return {
  success: true,
  original: queryString,
  parsed: parsed,
  object: object,
  stringified: stringified
};' \
'{
  "queryString": "name=张三&age=25&city=北京&tags[0]=javascript&tags[1]=golang",
  "object": {
    "name": "李四",
    "age": 30,
    "active": true
  }
}'

# ============================================================
# 分类 9: URL 处理 (Web 标准)
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 9: URL 处理 (Web 标准)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试21: URL 解析
run_test "URL 对象解析和操作" \
'const urlString = input.url;

// 解析 URL
const parsedUrl = new URL(urlString);

// 提取各部分
const result = {
  success: true,
  original: urlString,
  protocol: parsedUrl.protocol,
  hostname: parsedUrl.hostname,
  port: parsedUrl.port,
  pathname: parsedUrl.pathname,
  search: parsedUrl.search,
  hash: parsedUrl.hash,
  href: parsedUrl.href
};

// 解析查询参数
const params = {};
parsedUrl.searchParams.forEach((value, key) => {
  params[key] = value;
});
result.queryParams = params;

return result;' \
'{"url": "https://example.com:8080/path/to/page?name=test&age=25#section1"}'

# 测试22: URLSearchParams 操作
run_test "URLSearchParams 查询参数操作" \
'const queryString = input.queryString;

const params = new URLSearchParams(queryString);

// 获取值
const name = params.get("name");
const age = params.get("age");

// 检查是否存在
const hasCity = params.has("city");

// 添加参数
params.append("newParam", "newValue");

// 删除参数
params.delete("age");

// 转换为对象
const paramsObj = {};
params.forEach((value, key) => {
  paramsObj[key] = value;
});

return {
  success: true,
  original: queryString,
  name: name,
  age: age,
  hasCity: hasCity,
  modified: params.toString(),
  paramsObject: paramsObj
};' \
'{"queryString": "name=张三&age=25&category=tech"}'

# ============================================================
# 分类 10: Buffer 二进制处理
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 10: Buffer 二进制处理${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试23: Buffer 创建和转换
run_test "Buffer 二进制数据处理" \
'const text = input.text;

// 从字符串创建 Buffer
const buf1 = Buffer.from(text);

// Buffer 转 Base64
const base64 = buf1.toString("base64");

// Base64 转回 Buffer
const buf2 = Buffer.from(base64, "base64");

// Buffer 转 Hex
const hex = buf1.toString("hex");

// Hex 转回 Buffer
const buf3 = Buffer.from(hex, "hex");

return {
  success: true,
  original: text,
  bufferLength: buf1.length,
  base64: base64,
  hex: hex,
  decoded: buf2.toString("utf-8"),
  isValid: text === buf2.toString("utf-8")
};' \
'{"text": "Hello Buffer!"}'

# 测试24: Buffer 拼接和切片
run_test "Buffer 拼接和切片操作" \
'const text1 = input.text1;
const text2 = input.text2;

const buf1 = Buffer.from(text1);
const buf2 = Buffer.from(text2);

// 拼接
const concatenated = Buffer.concat([buf1, buf2]);

// 切片
const slice1 = concatenated.slice(0, buf1.length);
const slice2 = concatenated.slice(buf1.length);

return {
  success: true,
  text1: text1,
  text2: text2,
  concatenated: concatenated.toString("utf-8"),
  slice1: slice1.toString("utf-8"),
  slice2: slice2.toString("utf-8")
};' \
'{
  "text1": "Hello ",
  "text2": "World!"
}'

# ============================================================
# 分类 11: 异步流程控制
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 11: 异步流程控制${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试25: Promise.all 并发
run_test "Promise.all 并发执行" \
'async function fetchMultiple() {
  const urls = [
    "https://jsonplaceholder.typicode.com/todos/1",
    "https://jsonplaceholder.typicode.com/todos/2",
    "https://jsonplaceholder.typicode.com/todos/3"
  ];
  
  const promises = urls.map(url => fetch(url).then(r => r.json()));
  const results = await Promise.all(promises);
  
  return {
    success: true,
    count: results.length,
    todos: results
  };
}
return fetchMultiple();' \
'{}'

# 测试26: Promise.race 竞速
run_test "Promise.race 竞速执行" \
'async function raceTest() {
  const promise1 = new Promise((resolve) => {
    setTimeout(() => resolve({ source: "promise1", delay: 100 }), 100);
  });
  
  const promise2 = new Promise((resolve) => {
    setTimeout(() => resolve({ source: "promise2", delay: 50 }), 50);
  });
  
  const promise3 = new Promise((resolve) => {
    setTimeout(() => resolve({ source: "promise3", delay: 150 }), 150);
  });
  
  const winner = await Promise.race([promise1, promise2, promise3]);
  
  return {
    success: true,
    winner: winner,
    message: `${winner.source} won the race with ${winner.delay}ms delay`
  };
}
return raceTest();' \
'{}'

# 测试27: 错误处理 (try-catch)
run_test "异步错误处理和恢复" \
'async function errorHandling() {
  const results = [];
  
  // 测试1: 正常请求
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await response.json();
    results.push({
      test: "正常请求",
      success: true,
      data: data
    });
  } catch (error) {
    results.push({
      test: "正常请求",
      success: false,
      error: error.message
    });
  }
  
  // 测试2: 404错误
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/nonexistent");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    results.push({
      test: "404错误",
      success: true,
      data: data
    });
  } catch (error) {
    results.push({
      test: "404错误",
      success: false,
      error: error.message
    });
  }
  
  return {
    success: true,
    results: results
  };
}
return errorHandling();' \
'{}'

# ============================================================
# 分类 12: 复杂业务场景
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}分类 12: 复杂业务场景${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_separator

# 测试28: 数据转换和聚合
run_test "复杂数据转换和聚合" \
'const _ = require("lodash");

const orders = input.orders;

// 按用户分组
const groupedByUser = _.groupBy(orders, "userId");

// 计算每个用户的总金额
const userTotals = _.map(groupedByUser, (userOrders, userId) => {
  return {
    userId: userId,
    orderCount: userOrders.length,
    totalAmount: _.sumBy(userOrders, "amount"),
    avgAmount: _.meanBy(userOrders, "amount")
  };
});

// 找出消费最高的用户
const topUser = _.maxBy(userTotals, "totalAmount");

// 总统计
const grandTotal = _.sumBy(orders, "amount");

return {
  success: true,
  totalOrders: orders.length,
  grandTotal: grandTotal,
  userCount: Object.keys(groupedByUser).length,
  userTotals: userTotals,
  topUser: topUser
};' \
'{
  "orders": [
    {"id": 1, "userId": "user1", "amount": 100},
    {"id": 2, "userId": "user2", "amount": 200},
    {"id": 3, "userId": "user1", "amount": 150},
    {"id": 4, "userId": "user3", "amount": 300},
    {"id": 5, "userId": "user2", "amount": 250},
    {"id": 6, "userId": "user1", "amount": 180}
  ]
}'

# 测试29: 数据验证和清洗
run_test "数据验证和清洗" \
'const _ = require("lodash");

const rawData = input.data;

// 验证和清洗
const cleaned = rawData.map((item, index) => {
  const errors = [];
  
  // 验证名称
  if (!item.name || item.name.trim() === "") {
    errors.push("名称不能为空");
  }
  
  // 验证年龄
  if (!item.age || item.age < 0 || item.age > 150) {
    errors.push("年龄无效");
  }
  
  // 验证邮箱
  if (!item.email || !item.email.includes("@")) {
    errors.push("邮箱格式错误");
  }
  
  return {
    index: index,
    original: item,
    isValid: errors.length === 0,
    errors: errors,
    cleaned: errors.length === 0 ? {
      name: item.name.trim(),
      age: item.age,
      email: item.email.toLowerCase()
    } : null
  };
});

const validData = cleaned.filter(item => item.isValid).map(item => item.cleaned);
const invalidData = cleaned.filter(item => !item.isValid);

return {
  success: true,
  total: rawData.length,
  valid: validData.length,
  invalid: invalidData.length,
  validData: validData,
  invalidData: invalidData
};' \
'{
  "data": [
    {"name": "张三", "age": 25, "email": "zhang@example.com"},
    {"name": "", "age": 30, "email": "li@example.com"},
    {"name": "王五", "age": -5, "email": "wang@example.com"},
    {"name": "赵六", "age": 28, "email": "invalid-email"},
    {"name": "钱七", "age": 35, "email": "qian@EXAMPLE.COM"}
  ]
}'

# 测试30: API 数据整合
run_test "多源数据整合和关联" \
'const axios = require("axios");
const _ = require("lodash");

async function integrateData() {
  try {
    // 获取用户列表
    const usersRes = await axios.get("https://jsonplaceholder.typicode.com/users");
    const users = usersRes.data.slice(0, 3); // 只取前3个
    
    // 获取文章列表
    const postsRes = await axios.get("https://jsonplaceholder.typicode.com/posts");
    const posts = postsRes.data;
    
    // 整合数据: 每个用户关联其文章
    const integrated = users.map(user => {
      const userPosts = posts.filter(post => post.userId === user.id);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        postCount: userPosts.length,
        posts: userPosts.slice(0, 2) // 只取前2篇文章
      };
    });
    
    return {
      success: true,
      userCount: integrated.length,
      data: integrated
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return integrateData();' \
'{}'

# ============================================================
# 测试总结
# ============================================================
print_separator
echo -e "${YELLOW}"
echo "╔════════════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                                    ║"
echo "║                              测试总结                                               ║"
echo "║                          Test Summary                                              ║"
echo "║                                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "总测试数: ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "通过: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "失败: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 ${FAILED_TESTS} 个测试失败${NC}"
    exit 1
fi




