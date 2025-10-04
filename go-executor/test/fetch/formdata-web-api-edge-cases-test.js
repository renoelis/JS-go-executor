/**
 * Web API FormData 边界情况和边缘测试
 * 
 * 测试目标：
 * 1. 超大字段名/值
 * 2. Unicode 字符测试（中文、emoji、特殊字符）
 * 3. 超多字段性能测试
 * 4. 错误情况测试
 * 5. 特殊字符处理
 */

console.log('========================================');
console.log('Web API FormData 边界情况测试');
console.log('========================================\n');

// 测试结果收集
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
        if (details && details.error) {
            console.log('     错误: ' + details.error);
        }
    }
    testResults.tests.push({
        name: name,
        passed: passed,
        details: details || {}
    });
}

// ========================================
// 测试 1: 超大字段名
// ========================================
console.log('\n【测试 1】超大字段名');
console.log('----------------------------------------');

try {
    var fd1 = new FormData();
    
    // 生成 1KB 的字段名
    var longName = '';
    for (var i = 0; i < 1024; i++) {
        longName += 'a';
    }
    
    fd1.append(longName, 'value1');
    console.log('  字段名长度:', longName.length, 'bytes');
    
    var retrieved = fd1.get(longName);
    var success = retrieved === 'value1';
    
    addTestResult('超大字段名 (1KB) - append 和 get', success, {
        nameLength: longName.length,
        valueMatch: retrieved === 'value1'
    });
    
    // 生成 10KB 的字段名
    var veryLongName = '';
    for (var i = 0; i < 10240; i++) {
        veryLongName += 'b';
    }
    
    fd1.append(veryLongName, 'value2');
    console.log('  超长字段名长度:', veryLongName.length, 'bytes');
    
    var retrieved2 = fd1.get(veryLongName);
    var success2 = retrieved2 === 'value2';
    
    addTestResult('超大字段名 (10KB) - append 和 get', success2, {
        nameLength: veryLongName.length,
        valueMatch: retrieved2 === 'value2'
    });
    
} catch (e) {
    addTestResult('超大字段名测试', false, { error: e.message });
}

// ========================================
// 测试 2: 超大字段值
// ========================================
console.log('\n【测试 2】超大字段值');
console.log('----------------------------------------');

try {
    var fd2 = new FormData();
    
    // 生成 1MB 的字段值
    var longValue = '';
    for (var i = 0; i < 1024 * 1024; i++) {
        longValue += 'x';
    }
    
    console.log('  字段值长度:', longValue.length, 'bytes (1MB)');
    
    fd2.append('largeField', longValue);
    
    var retrieved = fd2.get('largeField');
    var success = retrieved === longValue;
    
    addTestResult('超大字段值 (1MB) - append 和 get', success, {
        valueLength: longValue.length,
        matchesOriginal: retrieved === longValue
    });
    
} catch (e) {
    addTestResult('超大字段值测试', false, { error: e.message });
}

// ========================================
// 测试 3: Unicode 字符测试
// ========================================
console.log('\n【测试 3】Unicode 字符测试');
console.log('----------------------------------------');

try {
    var fd3 = new FormData();
    
    // 测试 1: 中文
    fd3.append('中文字段', '中文值');
    var chineseValue = fd3.get('中文字段');
    console.log('  中文字段 → "' + chineseValue + '"');
    
    addTestResult('Unicode - 中文字段名和值', chineseValue === '中文值', {
        expected: '中文值',
        actual: chineseValue
    });
    
    // 测试 2: Emoji
    fd3.append('emoji', '😀🎉🚀');
    var emojiValue = fd3.get('emoji');
    console.log('  Emoji → "' + emojiValue + '"');
    
    addTestResult('Unicode - Emoji 值', emojiValue === '😀🎉🚀', {
        expected: '😀🎉🚀',
        actual: emojiValue
    });
    
    // 测试 3: 日文
    fd3.append('日本語', 'こんにちは');
    var japaneseValue = fd3.get('日本語');
    console.log('  日文 → "' + japaneseValue + '"');
    
    addTestResult('Unicode - 日文', japaneseValue === 'こんにちは');
    
    // 测试 4: 韩文
    fd3.append('한국어', '안녕하세요');
    var koreanValue = fd3.get('한국어');
    console.log('  韩文 → "' + koreanValue + '"');
    
    addTestResult('Unicode - 韩文', koreanValue === '안녕하세요');
    
    // 测试 5: 混合 Unicode
    var mixedUnicode = '中文 English 日本語 한국어 😀';
    fd3.append('mixed', mixedUnicode);
    var mixedValue = fd3.get('mixed');
    console.log('  混合 Unicode → "' + mixedValue + '"');
    
    addTestResult('Unicode - 混合字符', mixedValue === mixedUnicode);
    
} catch (e) {
    addTestResult('Unicode 字符测试', false, { error: e.message });
}

// ========================================
// 测试 4: 特殊字符测试
// ========================================
console.log('\n【测试 4】特殊字符测试');
console.log('----------------------------------------');

try {
    var fd4 = new FormData();
    
    // 测试 1: 引号
    fd4.append('field1', 'value with "quotes"');
    var quotesValue = fd4.get('field1');
    console.log('  引号 → "' + quotesValue + '"');
    
    addTestResult('特殊字符 - 引号', quotesValue === 'value with "quotes"');
    
    // 测试 2: 换行符
    fd4.append('field2', 'line1\nline2\nline3');
    var newlineValue = fd4.get('field2');
    console.log('  换行符长度:', newlineValue.length);
    
    addTestResult('特殊字符 - 换行符', newlineValue === 'line1\nline2\nline3');
    
    // 测试 3: 制表符
    fd4.append('field3', 'col1\tcol2\tcol3');
    var tabValue = fd4.get('field3');
    
    addTestResult('特殊字符 - 制表符', tabValue === 'col1\tcol2\tcol3');
    
    // 测试 4: 特殊符号
    fd4.append('field4', '!@#$%^&*()_+-=[]{}|;:,.<>?/~`');
    var symbolsValue = fd4.get('field4');
    console.log('  特殊符号 → "' + symbolsValue + '"');
    
    addTestResult('特殊字符 - 符号', symbolsValue === '!@#$%^&*()_+-=[]{}|;:,.<>?/~`');
    
    // 测试 5: 空格和空字符串
    fd4.append('spaces', '   ');
    fd4.append('empty', '');
    
    var spacesValue = fd4.get('spaces');
    var emptyValue = fd4.get('empty');
    
    addTestResult('特殊字符 - 空格', spacesValue === '   ');
    addTestResult('特殊字符 - 空字符串', emptyValue === '');
    
} catch (e) {
    addTestResult('特殊字符测试', false, { error: e.message });
}

// ========================================
// 测试 5: 超多字段性能测试
// ========================================
console.log('\n【测试 5】超多字段性能测试');
console.log('----------------------------------------');

try {
    var fd5 = new FormData();
    
    var fieldCount = 1000;
    var startTime = Date.now();
    
    console.log('  添加 ' + fieldCount + ' 个字段...');
    
    // 添加 1000 个字段
    for (var i = 0; i < fieldCount; i++) {
        fd5.append('field' + i, 'value' + i);
    }
    
    var appendTime = Date.now() - startTime;
    console.log('  添加耗时:', appendTime, 'ms');
    
    addTestResult('性能 - 添加 1000 个字段', appendTime < 1000, {
        fieldCount: fieldCount,
        timeMs: appendTime,
        threshold: '< 1000ms'
    });
    
    // 测试遍历性能
    startTime = Date.now();
    var count = 0;
    fd5.forEach(function() {
        count++;
    });
    var forEachTime = Date.now() - startTime;
    
    console.log('  forEach 遍历耗时:', forEachTime, 'ms');
    console.log('  遍历条目数:', count);
    
    addTestResult('性能 - forEach 遍历 1000 字段', forEachTime < 500 && count === fieldCount, {
        count: count,
        timeMs: forEachTime,
        threshold: '< 500ms'
    });
    
    // 测试 get 性能
    startTime = Date.now();
    for (var i = 0; i < 100; i++) {
        fd5.get('field' + (i * 10));
    }
    var getTime = Date.now() - startTime;
    
    console.log('  100次 get 查询耗时:', getTime, 'ms');
    
    addTestResult('性能 - 100次 get 查询', getTime < 100, {
        queryCount: 100,
        timeMs: getTime,
        threshold: '< 100ms'
    });
    
} catch (e) {
    addTestResult('超多字段性能测试', false, { error: e.message });
}

// ========================================
// 测试 6: 错误情况测试
// ========================================
console.log('\n【测试 6】错误情况测试');
console.log('----------------------------------------');

try {
    var fd6 = new FormData();
    
    // 测试 1: append 无参数
    var error1Caught = false;
    try {
        fd6.append();
    } catch (e) {
        error1Caught = true;
        console.log('  append() 无参数 → 抛出错误: ' + e.message);
    }
    
    addTestResult('错误处理 - append() 无参数抛出错误', error1Caught);
    
    // 测试 2: append 单个参数
    var error2Caught = false;
    try {
        fd6.append('field1');
    } catch (e) {
        error2Caught = true;
        console.log('  append(name) 缺少 value → 抛出错误');
    }
    
    addTestResult('错误处理 - append() 缺少参数抛出错误', error2Caught);
    
    // 测试 3: set 无参数
    var error3Caught = false;
    try {
        fd6.set();
    } catch (e) {
        error3Caught = true;
    }
    
    addTestResult('错误处理 - set() 无参数抛出错误', error3Caught);
    
    // 测试 4: get 不存在的字段返回 null（不抛错）
    var nullValue = fd6.get('nonexistent');
    addTestResult('错误处理 - get() 不存在字段返回 null', nullValue === null);
    
    // 测试 5: delete 不存在的字段（不抛错）
    try {
        fd6.delete('nonexistent');
        addTestResult('错误处理 - delete() 不存在字段不抛错', true);
    } catch (e) {
        addTestResult('错误处理 - delete() 不存在字段不抛错', false, { error: e.message });
    }
    
    // 测试 6: forEach 回调不是函数
    var error6Caught = false;
    try {
        fd6.forEach('not a function');
    } catch (e) {
        error6Caught = true;
        console.log('  forEach(非函数) → 抛出错误: ' + e.message);
    }
    
    addTestResult('错误处理 - forEach() 非函数参数抛出错误', error6Caught);
    
} catch (e) {
    addTestResult('错误情况测试', false, { error: e.message });
}

// ========================================
// 测试 7: 重复字段名边界测试
// ========================================
console.log('\n【测试 7】重复字段名边界测试');
console.log('----------------------------------------');

try {
    var fd7 = new FormData();
    
    // 添加 100 个同名字段
    var repeatCount = 100;
    console.log('  添加 ' + repeatCount + ' 个同名字段...');
    
    for (var i = 0; i < repeatCount; i++) {
        fd7.append('repeated', 'value' + i);
    }
    
    var allValues = fd7.getAll('repeated');
    console.log('  getAll 返回数量:', allValues.length);
    
    addTestResult('边界 - 100 个同名字段', allValues.length === repeatCount, {
        expected: repeatCount,
        actual: allValues.length
    });
    
    // 验证顺序
    var orderCorrect = allValues[0] === 'value0' && 
                       allValues[50] === 'value50' && 
                       allValues[99] === 'value99';
    
    addTestResult('边界 - 同名字段保持顺序', orderCorrect, {
        first: allValues[0],
        middle: allValues[50],
        last: allValues[99]
    });
    
    // 使用 set 覆盖所有同名字段
    fd7.set('repeated', 'single');
    var afterSet = fd7.getAll('repeated');
    
    console.log('  set 后数量:', afterSet.length);
    
    addTestResult('边界 - set() 覆盖所有同名字段', afterSet.length === 1 && afterSet[0] === 'single', {
        count: afterSet.length,
        value: afterSet[0]
    });
    
} catch (e) {
    addTestResult('重复字段名边界测试', false, { error: e.message });
}

// ========================================
// 测试 8: 空值边界测试
// ========================================
console.log('\n【测试 8】空值边界测试');
console.log('----------------------------------------');

try {
    var fd8 = new FormData();
    
    // 空字段名
    fd8.append('', 'emptyNameValue');
    var emptyNameValue = fd8.get('');
    console.log('  空字段名 get → "' + emptyNameValue + '"');
    
    addTestResult('边界 - 空字段名', emptyNameValue === 'emptyNameValue');
    
    // 空值
    fd8.append('emptyValue', '');
    var emptyValue = fd8.get('emptyValue');
    console.log('  空值 get → "' + emptyValue + '"');
    
    addTestResult('边界 - 空值', emptyValue === '');
    
    // 空字段名 + 空值
    fd8.append('', '');
    var doubleEmpty = fd8.get('');
    
    addTestResult('边界 - 空字段名和空值', doubleEmpty === 'emptyNameValue' || doubleEmpty === '', {
        note: '空字段名可以有多个值'
    });
    
    // 只有空格的字段名
    fd8.append('   ', 'spaces');
    var spacesName = fd8.get('   ');
    
    addTestResult('边界 - 空格字段名', spacesName === 'spaces');
    
} catch (e) {
    addTestResult('空值边界测试', false, { error: e.message });
}

// ========================================
// 测试 9: 迭代器边界测试
// ========================================
console.log('\n【测试 9】迭代器边界测试');
console.log('----------------------------------------');

try {
    var fd9 = new FormData();
    
    // 空 FormData 的迭代器
    var emptyEntries = fd9.entries();
    var emptyKeys = fd9.keys();
    var emptyValues = fd9.values();
    
    console.log('  空 FormData:');
    console.log('    entries 类型:', typeof emptyEntries);
    console.log('    keys 类型:', typeof emptyKeys);
    console.log('    values 类型:', typeof emptyValues);
    
    // 检查空迭代器：第一次调用 next() 应该返回 done: true
    var emptyEntriesFirst = emptyEntries.next();
    var emptyKeysFirst = emptyKeys.next();
    var emptyValuesFirst = emptyValues.next();
    
    addTestResult('迭代器边界 - 空 FormData entries', emptyEntriesFirst.done === true);
    addTestResult('迭代器边界 - 空 FormData keys', emptyKeysFirst.done === true);
    addTestResult('迭代器边界 - 空 FormData values', emptyValuesFirst.done === true);
    
    // 单个元素
    fd9.append('single', 'value');
    
    var singleEntries = fd9.entries();
    var singleKeys = fd9.keys();
    var singleValues = fd9.values();
    
    // 收集迭代器结果
    var entriesResult = singleEntries.next();
    var keysResult = singleKeys.next();
    var valuesResult = singleValues.next();
    
    // 检查第一个元素
    var entriesValid = !entriesResult.done && Array.isArray(entriesResult.value) && entriesResult.value.length === 2;
    var keysValid = !keysResult.done && keysResult.value === 'single';
    var valuesValid = !valuesResult.done && valuesResult.value === 'value';
    
    addTestResult('迭代器边界 - 单个元素 entries', entriesValid);
    addTestResult('迭代器边界 - 单个元素 keys', keysValid);
    addTestResult('迭代器边界 - 单个元素 values', valuesValid);
    
    // 检查第二次调用应该返回 done
    var entriesSecond = singleEntries.next();
    var keysSecond = singleKeys.next();
    var valuesSecond = singleValues.next();
    
    addTestResult('迭代器边界 - 单个元素后迭代完成', 
        entriesSecond.done === true && keysSecond.done === true && valuesSecond.done === true);
    
} catch (e) {
    addTestResult('迭代器边界测试', false, { error: e.message });
}

// ========================================
// 测试 10: CRUD 操作组合测试
// ========================================
console.log('\n【测试 10】CRUD 操作组合测试');
console.log('----------------------------------------');

try {
    var fd10 = new FormData();
    
    // 复杂操作序列
    fd10.append('a', '1');
    fd10.append('b', '2');
    fd10.append('c', '3');
    fd10.set('a', '10');     // 覆盖
    fd10.delete('b');        // 删除
    fd10.append('a', '11');  // 再次添加同名
    fd10.append('d', '4');   // 新增
    
    console.log('  操作序列: append(a,1) → append(b,2) → append(c,3) → set(a,10) → delete(b) → append(a,11) → append(d,4)');
    
    // 收集迭代器结果
    var keysIter = fd10.keys();
    var valuesIter = fd10.values();
    
    var keys = [];
    var values = [];
    var result;
    
    while (!(result = keysIter.next()).done) {
        keys.push(result.value);
    }
    
    while (!(result = valuesIter.next()).done) {
        values.push(result.value);
    }
    
    console.log('  最终 keys:', JSON.stringify(keys));
    console.log('  最终 values:', JSON.stringify(values));
    
    // 验证结果
    var hasA = fd10.has('a');
    var hasB = fd10.has('b');
    var hasC = fd10.has('c');
    var hasD = fd10.has('d');
    
    var allA = fd10.getAll('a');
    
    addTestResult('CRUD 组合 - 字段存在性', hasA && !hasB && hasC && hasD, {
        a: hasA,
        b: hasB,
        c: hasC,
        d: hasD
    });
    
    addTestResult('CRUD 组合 - set+append 同名字段', allA.length === 2 && allA[0] === '10' && allA[1] === '11', {
        count: allA.length,
        values: allA
    });
    
} catch (e) {
    addTestResult('CRUD 操作组合测试', false, { error: e.message });
}

// ========================================
// 总结
// ========================================
setTimeout(function() {
    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log('总测试数:', testResults.total);
    console.log('通过:', testResults.passed, '(' + Math.round(testResults.passed / testResults.total * 100) + '%)');
    console.log('失败:', testResults.failed);
    
    if (testResults.failed > 0) {
        console.log('\n失败的测试:');
        testResults.tests.forEach(function(test) {
            if (!test.passed) {
                console.log('  ❌', test.name);
                if (test.details.error) {
                    console.log('     ', test.details.error);
                }
            }
        });
    }
    
    console.log('\n========================================');
    
    if (testResults.failed === 0) {
        console.log('🎉 所有边界情况测试通过！');
    } else {
        console.log('⚠️  存在失败的测试，请检查');
    }
    
    console.log('========================================');
}, 100);

return testResults;

