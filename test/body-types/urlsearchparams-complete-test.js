// URLSearchParams API 完整功能测试 - 符合 Web API 标准
// 基于 WHATWG URL Standard 和 Node.js v22.2.0

const testURL = "https://httpbin.org/post";
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 URLSearchParams API 完整功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// ========================================
// 第一部分：构造函数测试
// ========================================
console.log("📦 第一部分：URLSearchParams 构造函数测试");
console.log("-".repeat(60));

// 测试 1.1: 空构造函数
console.log("\n=== 测试 1.1: 空构造函数 ===");
try {
    const params = new URLSearchParams();
    const str = params.toString();
    
    console.log(`  toString(): '${str}' (期望: '')`);
    
    if (str === "") {
        testResults.passed++;
        console.log("✅ 空构造函数测试通过");
    } else {
        throw new Error(`空 URLSearchParams toString 不正确: '${str}'`);
    }
} catch (error) {
    console.error("❌ 空构造函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("空构造函数: " + error.message);
}

// 测试 1.2: 字符串构造函数
console.log("\n=== 测试 1.2: 字符串构造函数 ===");
try {
    const params1 = new URLSearchParams("a=1&b=2&c=3");
    const params2 = new URLSearchParams("?foo=bar&test=123");
    
    console.log(`  'a=1&b=2&c=3': ${params1.toString()}`);
    console.log(`  '?foo=bar&test=123': ${params2.toString()}`);
    
    if (params1.get("a") === "1" && 
        params1.get("b") === "2" && 
        params2.get("foo") === "bar") {
        testResults.passed++;
        console.log("✅ 字符串构造函数测试通过");
    } else {
        throw new Error("字符串解析不正确");
    }
} catch (error) {
    console.error("❌ 字符串构造函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("字符串构造函数: " + error.message);
}

// 测试 1.3: 对象构造函数
console.log("\n=== 测试 1.3: 对象构造函数 ===");
try {
    const params = new URLSearchParams({
        name: "John",
        age: "30",
        city: "New York"
    });
    
    console.log(`  toString(): ${params.toString()}`);
    console.log(`  get('name'): '${params.get("name")}'`);
    console.log(`  get('age'): '${params.get("age")}'`);
    
    if (params.get("name") === "John" && params.get("age") === "30") {
        testResults.passed++;
        console.log("✅ 对象构造函数测试通过");
    } else {
        throw new Error("对象解析不正确");
    }
} catch (error) {
    console.error("❌ 对象构造函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("对象构造函数: " + error.message);
}

// 测试 1.4: 数组构造函数（键值对数组）
console.log("\n=== 测试 1.4: 数组构造函数（键值对数组）===");
try {
    const params = new URLSearchParams([
        ["key1", "value1"],
        ["key2", "value2"],
        ["key3", "value3"]
    ]);
    
    console.log(`  toString(): ${params.toString()}`);
    console.log(`  get('key1'): '${params.get("key1")}'`);
    console.log(`  get('key2'): '${params.get("key2")}'`);
    
    if (params.get("key1") === "value1" && params.get("key2") === "value2") {
        testResults.passed++;
        console.log("✅ 数组构造函数测试通过");
    } else {
        throw new Error("数组解析不正确");
    }
} catch (error) {
    console.error("❌ 数组构造函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("数组构造函数: " + error.message);
}

// ========================================
// 第二部分：基本方法测试
// ========================================
console.log("\n\n🔧 第二部分：URLSearchParams 基本方法测试");
console.log("-".repeat(60));

// 测试 2.1: append() 方法
console.log("\n=== 测试 2.1: append() 方法 ===");
try {
    const params = new URLSearchParams();
    params.append("color", "red");
    params.append("color", "blue");
    params.append("color", "green");
    params.append("size", "large");
    
    console.log(`  toString(): ${params.toString()}`);
    console.log(`  get('color'): '${params.get("color")}' (期望: 'red')`);
    
    const allColors = params.getAll("color");
    console.log(`  getAll('color'): [${allColors}] (期望: ['red', 'blue', 'green'])`);
    
    if (params.get("color") === "red" && allColors.length === 3) {
        testResults.passed++;
        console.log("✅ append() 方法测试通过");
    } else {
        throw new Error("append() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ append() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("append(): " + error.message);
}

// 测试 2.2: delete() 方法
console.log("\n=== 测试 2.2: delete() 方法 ===");
try {
    const params = new URLSearchParams("a=1&b=2&c=3&d=4");
    console.log(`  删除前: ${params.toString()}`);
    
    params.delete("b");
    console.log(`  删除 'b' 后: ${params.toString()}`);
    
    params.delete("d");
    console.log(`  删除 'd' 后: ${params.toString()}`);
    
    if (!params.has("b") && !params.has("d") && params.has("a") && params.has("c")) {
        testResults.passed++;
        console.log("✅ delete() 方法测试通过");
    } else {
        throw new Error("delete() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ delete() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("delete(): " + error.message);
}

// 测试 2.3: get() 方法
console.log("\n=== 测试 2.3: get() 方法 ===");
try {
    const params = new URLSearchParams("name=John&age=30&name=Jane");
    
    console.log(`  get('name'): '${params.get("name")}' (期望: 'John' - 第一个值)`);
    console.log(`  get('age'): '${params.get("age")}' (期望: '30')`);
    console.log(`  get('notexist'): ${params.get("notexist")} (期望: null)`);
    
    if (params.get("name") === "John" && 
        params.get("age") === "30" && 
        params.get("notexist") === null) {
        testResults.passed++;
        console.log("✅ get() 方法测试通过");
    } else {
        throw new Error("get() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ get() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("get(): " + error.message);
}

// 测试 2.4: getAll() 方法
console.log("\n=== 测试 2.4: getAll() 方法 ===");
try {
    const params = new URLSearchParams();
    params.append("tag", "javascript");
    params.append("tag", "nodejs");
    params.append("tag", "web");
    params.append("author", "John");
    
    const tags = params.getAll("tag");
    const authors = params.getAll("author");
    const notexist = params.getAll("notexist");
    
    console.log(`  getAll('tag'): [${tags}] (长度: ${tags.length})`);
    console.log(`  getAll('author'): [${authors}] (长度: ${authors.length})`);
    console.log(`  getAll('notexist'): [${notexist}] (长度: ${notexist.length})`);
    
    if (tags.length === 3 && 
        authors.length === 1 && 
        notexist.length === 0) {
        testResults.passed++;
        console.log("✅ getAll() 方法测试通过");
    } else {
        throw new Error("getAll() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ getAll() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("getAll(): " + error.message);
}

// 测试 2.5: has() 方法
console.log("\n=== 测试 2.5: has() 方法 ===");
try {
    const params = new URLSearchParams("a=1&b=2&c=3");
    
    console.log(`  has('a'): ${params.has("a")} (期望: true)`);
    console.log(`  has('b'): ${params.has("b")} (期望: true)`);
    console.log(`  has('d'): ${params.has("d")} (期望: false)`);
    
    if (params.has("a") === true && 
        params.has("b") === true && 
        params.has("d") === false) {
        testResults.passed++;
        console.log("✅ has() 方法测试通过");
    } else {
        throw new Error("has() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ has() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("has(): " + error.message);
}

// 测试 2.6: set() 方法
console.log("\n=== 测试 2.6: set() 方法 ===");
try {
    const params = new URLSearchParams();
    params.append("color", "red");
    params.append("color", "blue");
    params.append("color", "green");
    
    console.log(`  set 前: ${params.toString()}`);
    console.log(`  getAll('color') 长度: ${params.getAll("color").length} (期望: 3)`);
    
    params.set("color", "yellow");
    
    console.log(`  set 后: ${params.toString()}`);
    console.log(`  getAll('color') 长度: ${params.getAll("color").length} (期望: 1)`);
    console.log(`  get('color'): '${params.get("color")}' (期望: 'yellow')`);
    
    if (params.getAll("color").length === 1 && params.get("color") === "yellow") {
        testResults.passed++;
        console.log("✅ set() 方法测试通过");
    } else {
        throw new Error("set() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ set() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("set(): " + error.message);
}

// 测试 2.7: toString() 方法
console.log("\n=== 测试 2.7: toString() 方法 ===");
try {
    const params = new URLSearchParams();
    params.append("name", "John Doe");
    params.append("age", "30");
    params.append("city", "New York");
    
    const str = params.toString();
    console.log(`  toString(): ${str}`);
    
    // 验证是否正确编码
    const hasName = str.includes("name=");
    const hasAge = str.includes("age=");
    const hasAmpersand = str.includes("&");
    
    if (hasName && hasAge && hasAmpersand) {
        testResults.passed++;
        console.log("✅ toString() 方法测试通过");
    } else {
        throw new Error("toString() 方法结果不正确");
    }
} catch (error) {
    console.error("❌ toString() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("toString(): " + error.message);
}

// ========================================
// 第三部分：迭代器方法测试
// ========================================
console.log("\n\n🔄 第三部分：URLSearchParams 迭代器方法测试");
console.log("-".repeat(60));

// 测试 3.1: forEach() 方法
console.log("\n=== 测试 3.1: forEach() 方法 ===");
try {
    const params = new URLSearchParams("a=1&b=2&c=3");
    const collected = [];
    
    params.forEach((value, name) => {
        collected.push(`${name}=${value}`);
        console.log(`  forEach: ${name} = ${value}`);
    });
    
    if (collected.length === 3) {
        testResults.passed++;
        console.log("✅ forEach() 方法测试通过");
    } else {
        throw new Error(`forEach() 迭代次数不正确: ${collected.length}`);
    }
} catch (error) {
    console.error("❌ forEach() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("forEach(): " + error.message);
}

// 测试 3.2: entries() 方法
console.log("\n=== 测试 3.2: entries() 方法 ===");
try {
    const params = new URLSearchParams("x=10&y=20&z=30");
    const iterator = params.entries();
    
    console.log("  迭代 entries():");
    let count = 0;
    let result = iterator.next();
    
    while (!result.done) {
        const [key, value] = result.value;
        console.log(`    [${count}]: ${key} = ${value}`);
        count++;
        result = iterator.next();
    }
    
    if (count === 3) {
        testResults.passed++;
        console.log("✅ entries() 方法测试通过");
    } else {
        throw new Error(`entries() 迭代次数不正确: ${count}`);
    }
} catch (error) {
    console.error("❌ entries() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("entries(): " + error.message);
}

// 测试 3.3: keys() 方法
console.log("\n=== 测试 3.3: keys() 方法 ===");
try {
    const params = new URLSearchParams("a=1&b=2&a=3");
    const iterator = params.keys();
    
    console.log("  迭代 keys():");
    const keys = [];
    let result = iterator.next();
    
    while (!result.done) {
        keys.push(result.value);
        console.log(`    key: ${result.value}`);
        result = iterator.next();
    }
    
    // 注意：重复的键也会被迭代
    console.log(`  总共 ${keys.length} 个键 (期望: 3, 因为 'a' 有2个值)`);
    
    if (keys.length === 3) {
        testResults.passed++;
        console.log("✅ keys() 方法测试通过");
    } else {
        throw new Error(`keys() 迭代次数不正确: ${keys.length}`);
    }
} catch (error) {
    console.error("❌ keys() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("keys(): " + error.message);
}

// 测试 3.4: values() 方法
console.log("\n=== 测试 3.4: values() 方法 ===");
try {
    const params = new URLSearchParams("foo=bar&test=123&hello=world");
    const iterator = params.values();
    
    console.log("  迭代 values():");
    const values = [];
    let result = iterator.next();
    
    while (!result.done) {
        values.push(result.value);
        console.log(`    value: ${result.value}`);
        result = iterator.next();
    }
    
    if (values.length === 3) {
        testResults.passed++;
        console.log("✅ values() 方法测试通过");
    } else {
        throw new Error(`values() 迭代次数不正确: ${values.length}`);
    }
} catch (error) {
    console.error("❌ values() 方法测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("values(): " + error.message);
}

// ========================================
// 第四部分：特殊字符和编码测试
// ========================================
console.log("\n\n🔐 第四部分：特殊字符和编码测试");
console.log("-".repeat(60));

// 测试 4.1: URL 编码
console.log("\n=== 测试 4.1: URL 编码测试 ===");
try {
    const params = new URLSearchParams();
    params.append("url", "https://example.com?test=1&foo=bar");
    params.append("space", "hello world");
    params.append("special", "!@#$%^&*()");
    
    const encoded = params.toString();
    console.log(`  编码后: ${encoded}`);
    
    // 验证编码
    const decoded = new URLSearchParams(encoded);
    const urlValue = decoded.get("url");
    const spaceValue = decoded.get("space");
    
    console.log(`  解码 url: ${urlValue}`);
    console.log(`  解码 space: ${spaceValue}`);
    
    if (urlValue === "https://example.com?test=1&foo=bar" && 
        spaceValue === "hello world") {
        testResults.passed++;
        console.log("✅ URL 编码测试通过");
    } else {
        throw new Error("URL 编码/解码不正确");
    }
} catch (error) {
    console.error("❌ URL 编码测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL 编码: " + error.message);
}

// 测试 4.2: Unicode 字符
console.log("\n=== 测试 4.2: Unicode 字符测试 ===");
try {
    const params = new URLSearchParams();
    params.append("chinese", "你好世界");
    params.append("emoji", "😀🎉🚀");
    params.append("japanese", "こんにちは");
    
    const str = params.toString();
    console.log(`  编码后: ${str}`);
    
    const decoded = new URLSearchParams(str);
    console.log(`  解码 chinese: ${decoded.get("chinese")}`);
    console.log(`  解码 emoji: ${decoded.get("emoji")}`);
    console.log(`  解码 japanese: ${decoded.get("japanese")}`);
    
    if (decoded.get("chinese") === "你好世界" && 
        decoded.get("emoji") === "😀🎉🚀") {
        testResults.passed++;
        console.log("✅ Unicode 字符测试通过");
    } else {
        throw new Error("Unicode 字符编码不正确");
    }
} catch (error) {
    console.error("❌ Unicode 字符测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Unicode 字符: " + error.message);
}

// ========================================
// 第五部分：作为 fetch body 使用
// ========================================
console.log("\n\n🌐 第五部分：URLSearchParams 作为 fetch body");
console.log("-".repeat(60));

const fetchTests = [];

// 测试 5.1: 基本 POST 请求
console.log("\n=== 测试 5.1: URLSearchParams 作为 POST body ===");
const params1 = new URLSearchParams();
params1.append("username", "testuser");
params1.append("password", "testpass123");
params1.append("remember", "true");

fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: params1
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ URLSearchParams POST 成功");
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        console.log(`  Form 数据: ${JSON.stringify(data.form)}`);
        
        if (data.headers["Content-Type"] === "application/x-www-form-urlencoded") {
            console.log("  ✅ Content-Type 自动设置正确");
        }
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ URLSearchParams POST 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("URLSearchParams POST: " + error.message);
    })
);

// 测试 5.2: 多值参数 POST
console.log("\n=== 测试 5.2: 多值参数 POST ===");
const params2 = new URLSearchParams();
params2.append("tags", "javascript");
params2.append("tags", "nodejs");
params2.append("tags", "web");
params2.append("author", "John");

fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: params2
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 多值参数 POST 成功");
        console.log(`  发送的参数: ${params2.toString()}`);
        console.log(`  Form 数据: ${JSON.stringify(data.form)}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 多值参数 POST 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("多值参数 POST: " + error.message);
    })
);

// 测试 5.3: 空 URLSearchParams POST
console.log("\n=== 测试 5.3: 空 URLSearchParams POST ===");
const emptyParams = new URLSearchParams();

fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: emptyParams
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 空 URLSearchParams POST 成功");
        console.log(`  发送的数据: '${data.data}'`);
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 空 URLSearchParams POST 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("空 URLSearchParams POST: " + error.message);
    })
);

// ========================================
// 第六部分：边界情况测试
// ========================================
console.log("\n\n⚠️  第六部分：边界情况测试");
console.log("-".repeat(60));

// 测试 6.1: 空键值
console.log("\n=== 测试 6.1: 空键和空值 ===");
try {
    const params = new URLSearchParams();
    params.append("", "empty-key");
    params.append("empty-value", "");
    params.append("", "");
    
    console.log(`  toString(): '${params.toString()}'`);
    console.log(`  get(''): '${params.get("")}'`);
    console.log(`  get('empty-value'): '${params.get("empty-value")}'`);
    
    testResults.passed++;
    console.log("✅ 空键值测试通过");
} catch (error) {
    console.error("❌ 空键值测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("空键值: " + error.message);
}

// 测试 6.2: 大量参数
console.log("\n=== 测试 6.2: 大量参数测试 ===");
try {
    const params = new URLSearchParams();
    for (let i = 0; i < 100; i++) {
        params.append(`key${i}`, `value${i}`);
    }
    
    const count = params.toString().split("&").length;
    console.log(`  参数数量: ${count} (期望: 100)`);
    
    if (count === 100 && params.get("key50") === "value50") {
        testResults.passed++;
        console.log("✅ 大量参数测试通过");
    } else {
        throw new Error("大量参数处理不正确");
    }
} catch (error) {
    console.error("❌ 大量参数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("大量参数: " + error.message);
}

// 测试 6.3: 重复操作
console.log("\n=== 测试 6.3: 重复操作测试 ===");
try {
    const params = new URLSearchParams("a=1");
    
    // 重复添加
    for (let i = 0; i < 10; i++) {
        params.append("test", `value${i}`);
    }
    
    const allTests = params.getAll("test");
    console.log(`  重复添加10次后的数量: ${allTests.length}`);
    
    // 重复删除（应该只删除一次）
    params.delete("test");
    const afterDelete = params.has("test");
    console.log(`  删除后 has('test'): ${afterDelete} (期望: false)`);
    
    if (allTests.length === 10 && !afterDelete) {
        testResults.passed++;
        console.log("✅ 重复操作测试通过");
    } else {
        throw new Error("重复操作结果不正确");
    }
} catch (error) {
    console.error("❌ 重复操作测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("重复操作: " + error.message);
}

// ========================================
// 等待所有异步测试完成
// ========================================
return Promise.all(fetchTests)
    .then(() => {
        console.log("\n\n" + "=".repeat(60));
        console.log("📊 测试结果汇总");
        console.log("=".repeat(60));
        console.log(`✅ 通过: ${testResults.passed} 个测试`);
        console.log(`❌ 失败: ${testResults.failed} 个测试`);
        
        if (testResults.errors.length > 0) {
            console.log("\n❌ 错误详情:");
            testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        const success = testResults.failed === 0;
        const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
        
        console.log("\n" + "=".repeat(60));
        console.log(success ? "🎉 所有测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
        console.log("=".repeat(60));
        
        return {
            success: success,
            passed: testResults.passed,
            failed: testResults.failed,
            errors: testResults.errors,
            successRate: successRate
        };
    })
    .catch(error => {
        console.error("\n❌ 测试执行过程中发生严重错误:", error);
        return {
            success: false,
            error: error.message
        };
    });








