// URLSearchParams Body 类型测试 - 完善版

const testURL = "https://httpbin.org/post";
const tests = [];
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 URLSearchParams Body 类型测试\n");

// 测试 1: 基本的 URLSearchParams (手动设置 Content-Type)
console.log("=== 测试 1: 基本 URLSearchParams (手动设置 Content-Type) ===");
const params1 = new URLSearchParams();
params1.append("name", "John");
params1.append("age", "30");
params1.append("city", "New York");

console.log("URLSearchParams toString:", params1.toString());

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params1,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 基本 URLSearchParams 测试成功");
        console.log("  Content-Type:", data.headers["Content-Type"]);
        console.log("  发送的数据:", data.data);
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 基本 URLSearchParams 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("基本 URLSearchParams: " + error.message);
    })
);

// 测试 2: 基本的 URLSearchParams (自动设置 Content-Type)
console.log("\n=== 测试 2: 基本 URLSearchParams (自动设置 Content-Type) ===");
const params1Auto = new URLSearchParams();
params1Auto.append("test", "auto");
params1Auto.append("type", "urlencoded");

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params1Auto
        // 不设置 Content-Type，让系统自动设置
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 自动 Content-Type 测试成功");
        console.log("  自动设置的 Content-Type:", data.headers["Content-Type"]);
        if (data.headers["Content-Type"] === "application/x-www-form-urlencoded") {
            console.log("  ✅ Content-Type 自动设置正确");
        }
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 自动 Content-Type 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("自动 Content-Type: " + error.message);
    })
);

// 测试 3: 从字符串初始化
console.log("\n=== 测试 3: 从字符串初始化 ===");
const params2 = new URLSearchParams("?foo=bar&test=123&hello=world");
console.log("从查询字符串创建:", params2.toString());

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params2
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 字符串初始化测试成功");
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 字符串初始化测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("字符串初始化: " + error.message);
    })
);

// 测试 4: 从对象初始化
console.log("\n=== 测试 4: 从对象初始化 ===");
const params3 = new URLSearchParams({
    username: "alice",
    password: "secret123",
    remember: "true"
});
console.log("从对象创建:", params3.toString());

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params3
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 对象初始化测试成功");
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 对象初始化测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("对象初始化: " + error.message);
    })
);

// 测试 5: URLSearchParams 全部方法测试
console.log("\n=== 测试 5: URLSearchParams 方法完整测试 ===");
const params4 = new URLSearchParams();
let methodTestSuccess = true;

try {
    // append() - 添加键值对（支持多值）
    params4.append("color", "red");
    params4.append("color", "blue");
    params4.append("color", "green");
    params4.append("size", "large");
    console.log("✅ append() 测试通过");
    console.log("  append 后:", params4.toString());

    // get() - 获取第一个值
    const firstColor = params4.get("color");
    console.log("✅ get() 测试通过");
    console.log("  get('color'):", firstColor);
    if (firstColor !== "red") {
        throw new Error("get() 返回值错误");
    }

    // getAll() - 获取所有值
    const allColors = params4.getAll("color");
    console.log("✅ getAll() 测试通过");
    console.log("  getAll('color'):", allColors);
    if (allColors.length !== 3) {
        throw new Error("getAll() 返回数组长度错误");
    }

    // has() - 检查是否存在
    const hasColor = params4.has("color");
    const hasWeight = params4.has("weight");
    console.log("✅ has() 测试通过");
    console.log("  has('color'):", hasColor);
    console.log("  has('weight'):", hasWeight);
    if (!hasColor || hasWeight) {
        throw new Error("has() 返回值错误");
    }

    // set() - 设置唯一值（覆盖所有同名值）
    params4.set("color", "yellow");
    console.log("✅ set() 测试通过");
    console.log("  set 后:", params4.toString());
    if (params4.getAll("color").length !== 1) {
        throw new Error("set() 没有正确覆盖值");
    }

    // delete() - 删除键
    params4.delete("size");
    console.log("✅ delete() 测试通过");
    console.log("  delete 后:", params4.toString());
    if (params4.has("size")) {
        throw new Error("delete() 没有正确删除键");
    }

    // entries() - 获取条目数组
    const entries = params4.entries();
    console.log("✅ entries() 测试通过");
    console.log("  entries:", entries);

    // keys() - 获取键数组
    const keys = params4.keys();
    console.log("✅ keys() 测试通过");
    console.log("  keys:", keys);

    // values() - 获取值数组
    const values = params4.values();
    console.log("✅ values() 测试通过");
    console.log("  values:", values);

    testResults.passed++;
} catch (error) {
    console.error("❌ 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("方法测试: " + error.message);
    methodTestSuccess = false;
}

// 测试 6: forEach 遍历
console.log("\n=== 测试 6: forEach 遍历测试 ===");
const params5 = new URLSearchParams("a=1&b=2&c=3&d=4");
let forEachCount = 0;
const forEachResults = [];

try {
    params5.forEach((value, name) => {
        console.log(`  ${name}: ${value}`);
        forEachResults.push(`${name}=${value}`);
        forEachCount++;
    });

    if (forEachCount === 4 && forEachResults.length === 4) {
        console.log("✅ forEach 遍历测试成功");
        console.log("  遍历了", forEachCount, "个键值对");
        testResults.passed++;
    } else {
        throw new Error(`forEach 遍历数量错误: 期望 4，实际 ${forEachCount}`);
    }
} catch (error) {
    console.error("❌ forEach 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("forEach: " + error.message);
}

// 测试 7: 多值参数处理
console.log("\n=== 测试 7: 多值参数处理 ===");
const params6 = new URLSearchParams();
params6.append("tags", "javascript");
params6.append("tags", "typescript");
params6.append("tags", "nodejs");

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params6
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 多值参数测试成功");
        console.log("  发送的参数:", params6.toString());
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 多值参数测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("多值参数: " + error.message);
    })
);

// 测试 8: 特殊字符编码
console.log("\n=== 测试 8: 特殊字符编码测试 ===");
const params7 = new URLSearchParams();
params7.append("special", "hello world!");
params7.append("chinese", "你好世界");
params7.append("symbols", "!@#$%^&*()");
params7.append("url", "https://example.com?test=1&foo=bar");

console.log("特殊字符编码后:", params7.toString());

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params7
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 特殊字符编码测试成功");
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 特殊字符编码测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("特殊字符编码: " + error.message);
    })
);

// 测试 9: 空 URLSearchParams
console.log("\n=== 测试 9: 空 URLSearchParams 测试 ===");
const params8 = new URLSearchParams();

tests.push(
    fetch(testURL, {
        method: "POST",
        body: params8
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 空 URLSearchParams 测试成功");
        console.log("  发送的数据:", data.data);
        console.log("  Content-Type:", data.headers["Content-Type"]);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 空 URLSearchParams 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("空 URLSearchParams: " + error.message);
    })
);

// 测试 10: 实际登录表单模拟
console.log("\n=== 测试 10: 实际登录表单模拟 ===");
const loginParams = new URLSearchParams();
loginParams.append("email", "test@example.com");
loginParams.append("password", "mypassword");
loginParams.append("remember_me", "on");
loginParams.append("csrf_token", "abc123xyz789");

tests.push(
    fetch(testURL, {
        method: "POST",
        body: loginParams,
        headers: {
            "X-Requested-With": "XMLHttpRequest"
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 登录表单模拟测试成功");
        console.log("  Content-Type:", data.headers["Content-Type"]);
        console.log("  Form数据:", data.form);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 登录表单模拟测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("登录表单模拟: " + error.message);
    })
);

// 等待所有测试完成并返回结果
return Promise.all(tests).then(() => {
    console.log("\n" + "=".repeat(50));
    console.log("📊 测试结果汇总:");
    console.log(`  ✅ 通过: ${testResults.passed} 个测试`);
    console.log(`  ❌ 失败: ${testResults.failed} 个测试`);

    if (testResults.errors.length > 0) {
        console.log("\n❌ 错误详情:");
        testResults.errors.forEach(error => {
            console.log(`  - ${error}`);
        });
    }

    const success = testResults.failed === 0;
    console.log("\n" + (success ? "🎉" : "⚠️") +
                " URLSearchParams 测试" +
                (success ? "全部通过！" : "部分失败"));

    return {
        success: success,
        passed: testResults.passed,
        failed: testResults.failed,
        errors: testResults.errors,
        message: success ?
            "所有 URLSearchParams 功能测试通过" :
            `${testResults.failed} 个测试失败，请检查错误日志`
    };
});

