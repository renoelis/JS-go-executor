// 所有模块综合测试
console.log("🧪 测试所有导入的模块\n");

const results = {
    passed: [],
    failed: []
};

// 测试 1: uuid
try {
    const uuid = require('uuid');
    const id = uuid.v4();
    if (id && id.length === 36) {
        results.passed.push("✅ uuid");
        console.log("✅ uuid:", id);
    } else {
        results.failed.push("❌ uuid: 格式错误");
    }
} catch (e) {
    results.failed.push("❌ uuid: " + e.message);
}

// 测试 2: pinyin
try {
    const pinyin = require('pinyin');
    const result = pinyin('中国', { style: pinyin.STYLE_NORMAL });
    if (JSON.stringify(result) === '[["zhong"],["guo"]]') {
        results.passed.push("✅ pinyin");
        console.log("✅ pinyin:", JSON.stringify(result));
    } else {
        results.failed.push("❌ pinyin: 结果不匹配");
    }
} catch (e) {
    results.failed.push("❌ pinyin: " + e.message);
}

// 测试 3: lodash
try {
    const _ = require('lodash');
    const arr = [1, 2, 3, 4, 5, 6];
    const chunked = _.chunk(arr, 2);
    if (JSON.stringify(chunked) === '[[1,2],[3,4],[5,6]]') {
        results.passed.push("✅ lodash");
        console.log("✅ lodash:", JSON.stringify(chunked));
    } else {
        results.failed.push("❌ lodash: 结果不匹配");
    }
} catch (e) {
    results.failed.push("❌ lodash: " + e.message);
}

// 测试 4: qs
try {
    const qs = require('qs');
    const parsed = qs.parse('a=1&b=2&c=3');
    if (parsed.a === '1' && parsed.b === '2' && parsed.c === '3') {
        results.passed.push("✅ qs");
        console.log("✅ qs:", JSON.stringify(parsed));
    } else {
        results.failed.push("❌ qs: 结果不匹配");
    }
} catch (e) {
    results.failed.push("❌ qs: " + e.message);
}

// 测试 5: date-fns
try {
    const dateFns = require('date-fns');
    const formatted = dateFns.format(new Date('2025-10-03'), 'yyyy-MM-dd');
    if (formatted === '2025-10-03') {
        results.passed.push("✅ date-fns");
        console.log("✅ date-fns:", formatted);
    } else {
        results.failed.push("❌ date-fns: 结果不匹配");
    }
} catch (e) {
    results.failed.push("❌ date-fns: " + e.message);
}

console.log("\n📊 测试结果:");
console.log("通过:", results.passed.length);
console.log("失败:", results.failed.length);

if (results.failed.length > 0) {
    console.log("\n失败详情:");
    results.failed.forEach(function(msg) {
        console.log("  " + msg);
    });
}

return {
    success: results.failed.length === 0,
    passed: results.passed.length,
    failed: results.failed.length,
    details: results
};

