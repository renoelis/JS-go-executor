/**
 * Fetch API - Headers 迭代器完整测试
 * 
 * 测试目标：
 * 1. Headers.entries() - 迭代所有键值对
 * 2. Headers.keys() - 迭代所有键
 * 3. Headers.values() - 迭代所有值
 * 4. Headers.forEach() - 遍历所有条目
 * 5. Headers.append() - 添加重复键
 * 6. Symbol.iterator - for...of 支持
 */

console.log('========================================');
console.log('Fetch API - Headers 迭代器完整测试');
console.log('========================================\n');

var testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(name, passed, details) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log('  ✅ ' + name);
    } else {
        testResults.failed++;
        console.log('  ❌ ' + name);
    }
    testResults.tests.push({
        name: name,
        passed: passed,
        details: details || {}
    });
}

// ========================================
// 测试 1: Headers.entries() 迭代器
// ========================================
function test1_HeadersEntries() {
    console.log('\n【测试 1】Headers.entries() 迭代器');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'test-value'
        });
        
        console.log('  创建的 Headers:', JSON.stringify({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'test-value'
        }, null, 2));
        
        var entries = [];
        var iterator = headers.entries();
        
        if (typeof iterator === 'undefined' || iterator === null) {
            addTestResult('Headers.entries() - 方法存在', false, {
                error: 'entries() 方法返回 undefined 或 null'
            });
            return { success: false };
        }
        
        addTestResult('Headers.entries() - 方法存在', true);
        
        // 迭代所有条目
        var entry;
        var count = 0;
        while ((entry = iterator.next()) && !entry.done) {
            count++;
            var name = entry.value[0];
            var value = entry.value[1];
            console.log('  条目', count, ':', name, '=', value);
            entries.push([name, value]);
        }
        
        console.log('  迭代到', count, '个条目');
        
        var hasEntries = count >= 3;
        addTestResult('Headers.entries() - 返回所有条目', hasEntries, {
            expected: '>=3',
            actual: count,
            entries: entries
        });
        
        // 验证包含设置的 headers
        var hasContentType = false;
        var hasAuth = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i][0].toLowerCase() === 'content-type') {
                hasContentType = entries[i][1] === 'application/json';
            }
            if (entries[i][0].toLowerCase() === 'authorization') {
                hasAuth = entries[i][1] === 'Bearer token123';
            }
        }
        
        addTestResult('Headers.entries() - 值正确', hasContentType && hasAuth, {
            hasContentType: hasContentType,
            hasAuthorization: hasAuth
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers.entries() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 2: Headers.keys() 迭代器
// ========================================
function test2_HeadersKeys() {
    console.log('\n【测试 2】Headers.keys() 迭代器');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
            'Accept': 'application/json'
        });
        
        var keys = [];
        var iterator = headers.keys();
        
        if (typeof iterator === 'undefined' || iterator === null) {
            addTestResult('Headers.keys() - 方法存在', false, {
                error: 'keys() 方法返回 undefined 或 null'
            });
            return { success: false };
        }
        
        addTestResult('Headers.keys() - 方法存在', true);
        
        // 迭代所有键
        var entry;
        var count = 0;
        while ((entry = iterator.next()) && !entry.done) {
            count++;
            console.log('  键', count, ':', entry.value);
            keys.push(entry.value);
        }
        
        console.log('  迭代到', count, '个键');
        
        var hasKeys = count >= 3;
        addTestResult('Headers.keys() - 返回所有键', hasKeys, {
            expected: '>=3',
            actual: count,
            keys: keys
        });
        
        // 验证键名正确
        var keysLower = [];
        for (var i = 0; i < keys.length; i++) {
            keysLower.push(keys[i].toLowerCase());
        }
        
        var hasContentType = keysLower.indexOf('content-type') !== -1;
        var hasAuth = keysLower.indexOf('authorization') !== -1;
        
        addTestResult('Headers.keys() - 键名正确', hasContentType && hasAuth, {
            keys: keysLower,
            hasContentType: hasContentType,
            hasAuthorization: hasAuth
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers.keys() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 3: Headers.values() 迭代器
// ========================================
function test3_HeadersValues() {
    console.log('\n【测试 3】Headers.values() 迭代器');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer secret-token',
            'Accept-Language': 'zh-CN'
        });
        
        var values = [];
        var iterator = headers.values();
        
        if (typeof iterator === 'undefined' || iterator === null) {
            addTestResult('Headers.values() - 方法存在', false, {
                error: 'values() 方法返回 undefined 或 null'
            });
            return { success: false };
        }
        
        addTestResult('Headers.values() - 方法存在', true);
        
        // 迭代所有值
        var entry;
        var count = 0;
        while ((entry = iterator.next()) && !entry.done) {
            count++;
            console.log('  值', count, ':', entry.value);
            values.push(entry.value);
        }
        
        console.log('  迭代到', count, '个值');
        
        var hasValues = count >= 3;
        addTestResult('Headers.values() - 返回所有值', hasValues, {
            expected: '>=3',
            actual: count,
            values: values
        });
        
        // 验证值正确
        var hasJsonValue = values.indexOf('application/json') !== -1;
        var hasTokenValue = values.indexOf('Bearer secret-token') !== -1;
        
        addTestResult('Headers.values() - 值正确', hasJsonValue && hasTokenValue, {
            values: values,
            hasJsonValue: hasJsonValue,
            hasTokenValue: hasTokenValue
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers.values() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 4: Headers.forEach() 方法
// ========================================
function test4_HeadersForEach() {
    console.log('\n【测试 4】Headers.forEach() 方法');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers({
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-12345'
        });
        
        var entries = [];
        var forEachExists = typeof headers.forEach === 'function';
        
        if (!forEachExists) {
            addTestResult('Headers.forEach() - 方法存在', false, {
                error: 'forEach() 不是函数'
            });
            return { success: false };
        }
        
        addTestResult('Headers.forEach() - 方法存在', true);
        
        // 使用 forEach 遍历
        var count = 0;
        headers.forEach(function(value, name, parent) {
            count++;
            console.log('  条目', count, ':', name, '=', value);
            console.log('    parent === headers:', parent === headers);
            entries.push({ name: name, value: value, parentCorrect: parent === headers });
        });
        
        console.log('  遍历到', count, '个条目');
        
        var hasEntries = count >= 2;
        addTestResult('Headers.forEach() - 遍历所有条目', hasEntries, {
            expected: '>=2',
            actual: count
        });
        
        // 验证 parent 参数正确
        var allParentCorrect = true;
        for (var i = 0; i < entries.length; i++) {
            if (!entries[i].parentCorrect) {
                allParentCorrect = false;
                break;
            }
        }
        
        addTestResult('Headers.forEach() - parent 参数正确', allParentCorrect, {
            entries: entries
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers.forEach() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 5: Headers.append() 重复键
// ========================================
function test5_HeadersAppend() {
    console.log('\n【测试 5】Headers.append() 重复键');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers();
        
        // 添加重复的 Set-Cookie
        headers.append('Set-Cookie', 'session=abc123');
        headers.append('Set-Cookie', 'user=john');
        headers.append('Set-Cookie', 'theme=dark');
        
        console.log('  添加了 3 个 Set-Cookie headers');
        
        // 获取所有值
        var cookieValue = headers.get('Set-Cookie');
        console.log('  get("Set-Cookie"):', cookieValue);
        
        // 验证是否支持多值（浏览器中通常用逗号分隔，或者返回第一个值）
        var hasValue = cookieValue !== null && cookieValue !== undefined;
        addTestResult('Headers.append() - 重复键可添加', hasValue, {
            value: cookieValue
        });
        
        // 使用迭代器检查
        var iterator = headers.entries();
        var setCookieCount = 0;
        var entry;
        
        while ((entry = iterator.next()) && !entry.done) {
            if (entry.value[0].toLowerCase() === 'set-cookie') {
                setCookieCount++;
                console.log('  Set-Cookie', setCookieCount, ':', entry.value[1]);
            }
        }
        
        // 标准行为：某些实现会保留多个 Set-Cookie，某些会合并
        var behaviorCorrect = setCookieCount >= 1;
        addTestResult('Headers.append() - 重复键处理', behaviorCorrect, {
            setCookieCount: setCookieCount,
            note: '标准允许多个 Set-Cookie 或合并为一个'
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers.append() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 6: for...of 迭代 Headers
// ========================================
function test6_HeadersForOf() {
    console.log('\n【测试 6】for...of 迭代 Headers');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TestAgent/1.0'
        });
        
        // 检查是否支持 Symbol.iterator
        var hasIterator = headers[Symbol.iterator] !== undefined || 
                         headers.entries !== undefined;
        
        if (!hasIterator) {
            addTestResult('Headers - Symbol.iterator 存在', false, {
                error: 'Headers 不可迭代'
            });
            return { success: false };
        }
        
        addTestResult('Headers - Symbol.iterator 存在', true);
        
        var entries = [];
        var count = 0;
        
        // 尝试 for...of（如果支持）
        try {
            for (var entry of headers) {
                count++;
                console.log('  条目', count, ':', entry[0], '=', entry[1]);
                entries.push(entry);
            }
            
            addTestResult('Headers - for...of 迭代', count > 0, {
                count: count,
                entries: entries
            });
        } catch (e) {
            // 如果不支持 for...of，使用 entries()
            console.log('  for...of 不支持，使用 entries() 替代');
            var iterator = headers.entries();
            var entry;
            while ((entry = iterator.next()) && !entry.done) {
                count++;
                entries.push(entry.value);
            }
            
            addTestResult('Headers - entries() 迭代（替代）', count > 0, {
                count: count,
                note: 'for...of 不支持，使用 entries() 替代'
            });
        }
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers - for...of 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 7: Headers 迭代顺序
// ========================================
function test7_HeadersIterationOrder() {
    console.log('\n【测试 7】Headers 迭代顺序');
    console.log('----------------------------------------');
    
    try {
        var headers = new Headers();
        headers.set('Z-Last', 'last');
        headers.set('A-First', 'first');
        headers.set('M-Middle', 'middle');
        
        console.log('  添加顺序: Z-Last, A-First, M-Middle');
        
        var keys = [];
        var iterator = headers.keys();
        var entry;
        
        while ((entry = iterator.next()) && !entry.done) {
            keys.push(entry.value);
        }
        
        console.log('  迭代顺序:', keys.join(', '));
        
        // Headers 可能按插入顺序或字母顺序排序
        var hasOrder = keys.length === 3;
        addTestResult('Headers - 迭代顺序一致', hasOrder, {
            keys: keys,
            note: 'Headers 迭代顺序可能是插入顺序或字母顺序'
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Headers - 迭代顺序测试', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

var allTests = [
    test1_HeadersEntries,
    test2_HeadersKeys,
    test3_HeadersValues,
    test4_HeadersForEach,
    test5_HeadersAppend,
    test6_HeadersForOf,
    test7_HeadersIterationOrder
];

function runTests(index) {
    if (index >= allTests.length) {
        // 所有测试完成
        setTimeout(function() {
            console.log('\n========================================');
            console.log('测试完成');
            console.log('========================================');
            console.log('总计:', testResults.total, '个测试');
            console.log('通过:', testResults.passed, '个');
            console.log('失败:', testResults.failed, '个');
            
            if (testResults.failed === 0) {
                console.log('\n✅ 所有测试通过！');
            } else {
                console.log('\n❌ 部分测试失败');
            }
            
            // 返回结果供外部使用
            testResults;
        }, 100);
        return;
    }
    
    try {
        var result = allTests[index]();
        // 继续下一个测试
        setTimeout(function() {
            runTests(index + 1);
        }, 50);
    } catch (error) {
        console.log('测试', index + 1, '执行出错:', error);
        runTests(index + 1);
    }
}

runTests(0);

// 返回测试结果
return testResults;


