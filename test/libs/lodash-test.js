// lodash 模块功能测试
const _ = require('lodash');

const results = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 Lodash 功能测试\n");

// 测试 1: 数组操作
console.log("=== 测试 1: 数组操作 ===");
try {
    const arr = [1, 2, 3, 4, 5];
    const chunked = _.chunk(arr, 2);
    const uniq = _.uniq([1, 2, 2, 3, 3]);
    const flat = _.flatten([[1, 2], [3, 4]]);
    
    console.log(`  chunk([1,2,3,4,5], 2): ${JSON.stringify(chunked)}`);
    console.log(`  uniq([1,2,2,3,3]): ${JSON.stringify(uniq)}`);
    console.log(`  flatten([[1,2],[3,4]]): ${JSON.stringify(flat)}`);
    
    if (chunked.length === 3 && uniq.length === 3 && flat.length === 4) {
        console.log("  ✅ 数组操作测试通过");
        results.passed++;
    } else {
        throw new Error("结果不正确");
    }
} catch (error) {
    console.error("  ❌ 失败:", error.message);
    results.failed++;
    results.errors.push(error.message);
}

// 测试 2: 对象操作
console.log("\n=== 测试 2: 对象操作 ===");
try {
    const obj = { a: 1, b: 2, c: 3 };
    const picked = _.pick(obj, ['a', 'b']);
    const omitted = _.omit(obj, ['c']);
    
    console.log(`  pick({a:1,b:2,c:3}, ['a','b']): ${JSON.stringify(picked)}`);
    console.log(`  omit({a:1,b:2,c:3}, ['c']): ${JSON.stringify(omitted)}`);
    
    if (picked.a === 1 && picked.b === 2 && omitted.a === 1) {
        console.log("  ✅ 对象操作测试通过");
        results.passed++;
    } else {
        throw new Error("结果不正确");
    }
} catch (error) {
    console.error("  ❌ 失败:", error.message);
    results.failed++;
    results.errors.push(error.message);
}

// 测试 3: 字符串处理
console.log("\n=== 测试 3: 字符串处理 ===");
try {
    const camel = _.camelCase('hello world');
    const snake = _.snakeCase('helloWorld');
    const kebab = _.kebabCase('HelloWorld');
    
    console.log(`  camelCase('hello world'): ${camel}`);
    console.log(`  snakeCase('helloWorld'): ${snake}`);
    console.log(`  kebabCase('HelloWorld'): ${kebab}`);
    
    if (camel === 'helloWorld' && snake === 'hello_world' && kebab === 'hello-world') {
        console.log("  ✅ 字符串处理测试通过");
        results.passed++;
    } else {
        throw new Error("结果不正确");
    }
} catch (error) {
    console.error("  ❌ 失败:", error.message);
    results.failed++;
    results.errors.push(error.message);
}

// 测试 4: 工具函数
console.log("\n=== 测试 4: 工具函数 ===");
try {
    const isEmpty1 = _.isEmpty({});
    const isEmpty2 = _.isEmpty({ a: 1 });
    const isArray = _.isArray([]);
    const isObject = _.isObject({});
    
    console.log(`  isEmpty({}): ${isEmpty1}`);
    console.log(`  isEmpty({a:1}): ${isEmpty2}`);
    console.log(`  isArray([]): ${isArray}`);
    console.log(`  isObject({}): ${isObject}`);
    
    if (isEmpty1 && !isEmpty2 && isArray && isObject) {
        console.log("  ✅ 工具函数测试通过");
        results.passed++;
    } else {
        throw new Error("结果不正确");
    }
} catch (error) {
    console.error("  ❌ 失败:", error.message);
    results.failed++;
    results.errors.push(error.message);
}

console.log("\n" + "=".repeat(60));
console.log(`✅ 通过: ${results.passed}`);
console.log(`❌ 失败: ${results.failed}`);
console.log(`📈 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

results.success = results.failed === 0;
results.message = results.success ? "所有 lodash 测试通过" : "部分测试失败";
return results;

