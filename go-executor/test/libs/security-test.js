// 安全检查测试 - 验证运行时限制是否生效
const tests = [];

// 测试 1: Function 访问（库需要，应该可用）
try {
    const f = Function;
    if (typeof f === 'function') {
        tests.push("✅ Function 可访问（库需要）");
    } else {
        tests.push("❌ Function 不可访问");
    }
} catch (e) {
    tests.push("❌ Function 访问异常: " + e.message);
}

// 测试 2: Reflect 被禁用
try {
    if (typeof Reflect === 'undefined') {
        tests.push("✅ Reflect 已被禁用");
    } else {
        tests.push("❌ Reflect 未被禁用");
    }
} catch (e) {
    tests.push("❌ Reflect 检测异常: " + e.message);
}

// 测试 3: Proxy 被禁用
try {
    if (typeof Proxy === 'undefined') {
        tests.push("✅ Proxy 已被禁用");
    } else {
        tests.push("❌ Proxy 未被禁用");
    }
} catch (e) {
    tests.push("❌ Proxy 检测异常: " + e.message);
}

// 测试 4: globalThis 被禁用
try {
    if (typeof globalThis === 'undefined') {
        tests.push("✅ globalThis 已被禁用");
    } else {
        tests.push("❌ globalThis 未被禁用");
    }
} catch (e) {
    tests.push("❌ globalThis 检测异常: " + e.message);
}

// 测试 5: window 被禁用
try {
    if (typeof window === 'undefined') {
        tests.push("✅ window 已被禁用");
    } else {
        tests.push("❌ window 未被禁用");
    }
} catch (e) {
    tests.push("❌ window 检测异常: " + e.message);
}

// 测试 6: self 被禁用
try {
    if (typeof self === 'undefined') {
        tests.push("✅ self 已被禁用");
    } else {
        tests.push("❌ self 未被禁用");
    }
} catch (e) {
    tests.push("❌ self 检测异常: " + e.message);
}

// 测试 7: eval 被禁用
try {
    if (typeof eval === 'undefined') {
        tests.push("✅ eval 已被禁用");
    } else {
        tests.push("❌ eval 未被禁用");
    }
} catch (e) {
    tests.push("❌ eval 检测异常: " + e.message);
}

// 测试 8: constructor 被删除
try {
    const obj = {};
    const k = 'constr' + 'uctor';
    if (obj[k] === undefined) {
        tests.push("✅ constructor 已被删除");
    } else {
        tests.push("❌ constructor 未被删除");
    }
} catch (e) {
    tests.push("❌ constructor 检测异常: " + e.message);
}

return {
    message: "运行时安全限制检查",
    tests: tests,
    summary: {
        total: tests.length,
        passed: tests.filter(t => t.startsWith("✅")).length,
        failed: tests.filter(t => t.startsWith("❌")).length
    }
};

