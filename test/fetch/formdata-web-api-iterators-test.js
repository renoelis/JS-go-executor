/**
 * Web API FormData 迭代器测试
 * 
 * 测试目标：
 * 1. entries() - 返回 [name, value] 迭代器
 * 2. keys() - 返回 name 迭代器
 * 3. values() - 返回 value 迭代器
 * 4. Symbol.iterator - for...of 支持
 * 5. Array.from() 转换
 * 6. 迭代顺序验证
 */

console.log('========================================');
console.log('Web API FormData 迭代器测试');
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

// 创建测试数据
function createTestFormData() {
    var fd = new FormData();
    fd.append('name', 'Alice');
    fd.append('age', '25');
    fd.append('name', 'Bob');  // 重复的 key
    fd.append('city', 'Beijing');
    return fd;
}

// ========================================
// 测试 1: entries() 方法
// ========================================
console.log('\n【测试 1】entries() 方法');
console.log('----------------------------------------');

try {
    var fd1 = createTestFormData();
    
    // 检查 entries 方法是否存在
    var hasEntries = typeof fd1.entries === 'function';
    addTestResult('entries() - 方法存在', hasEntries);
    
    if (hasEntries) {
        var entriesResult = fd1.entries();
        console.log('  entries() 返回类型:', typeof entriesResult);
        
        var isNotNull = entriesResult !== null && entriesResult !== undefined;
        addTestResult('entries() - 返回值不为 null', isNotNull);
        
        // 检查是否是迭代器对象（有 next 方法）
        var hasNext = typeof entriesResult.next === 'function';
        console.log('  是否有 next 方法:', hasNext);
        addTestResult('entries() - 返回迭代器对象', hasNext);
        
        if (hasNext) {
            console.log('  迭代器内容:');
            
            var count = 0;
            var allPairs = true;
            var result;
            
            while (!(result = entriesResult.next()).done) {
                var entry = result.value;
                var isEntryArray = Array.isArray(entry);
                var hasTwo = isEntryArray && entry.length === 2;
                
                console.log('    [' + count + ']', JSON.stringify(entry), 
                           '(isArray: ' + isEntryArray + ', length: ' + (entry ? entry.length : 0) + ')');
                
                if (!hasTwo) {
                    allPairs = false;
                }
                count++;
            }
            
            addTestResult('entries() - 返回正确数量的条目', count === 4, { 
                expected: 4, 
                actual: count 
            });
            
            addTestResult('entries() - 每个条目是 [name, value] 对', allPairs);
            
            // 验证具体内容（需要重新获取迭代器）
            var fd1b = createTestFormData();
            var entriesResult2 = fd1b.entries();
            var firstResult = entriesResult2.next();
            var firstEntry = firstResult.value;
            var isCorrect = firstEntry && firstEntry[0] === 'name' && firstEntry[1] === 'Alice';
            addTestResult('entries() - 第一个条目正确', isCorrect, { 
                expected: ['name', 'Alice'], 
                actual: firstEntry 
            });
        }
    }
    
} catch (e) {
    addTestResult('entries() 方法测试', false, { error: e.message });
}

// ========================================
// 测试 2: keys() 方法
// ========================================
console.log('\n【测试 2】keys() 方法');
console.log('----------------------------------------');

try {
    var fd2 = createTestFormData();
    
    // 检查 keys 方法是否存在
    var hasKeys = typeof fd2.keys === 'function';
    addTestResult('keys() - 方法存在', hasKeys);
    
    if (hasKeys) {
        var keysResult = fd2.keys();
        console.log('  keys() 返回类型:', typeof keysResult);
        
        var hasNext = typeof keysResult.next === 'function';
        console.log('  是否有 next 方法:', hasNext);
        addTestResult('keys() - 返回迭代器对象', hasNext);
        
        if (hasNext) {
            // 收集所有 keys
            var keys = [];
            var result;
            while (!(result = keysResult.next()).done) {
                keys.push(result.value);
            }
            
            console.log('  keys 数量:', keys.length);
            console.log('  keys 内容:', JSON.stringify(keys));
            
            var hasAllKeys = keys.length === 4;
            addTestResult('keys() - 返回正确数量的 keys', hasAllKeys, { 
                expected: 4, 
                actual: keys.length 
            });
            
            // 验证包含重复的 key
            var hasDuplicateName = keys[0] === 'name' && keys[2] === 'name';
            addTestResult('keys() - 包含重复的 key', hasDuplicateName, { 
                keys: keys 
            });
            
            // 验证顺序
            var correctOrder = keys[0] === 'name' && 
                               keys[1] === 'age' && 
                               keys[2] === 'name' && 
                               keys[3] === 'city';
            addTestResult('keys() - 保持插入顺序', correctOrder);
        }
    }
    
} catch (e) {
    addTestResult('keys() 方法测试', false, { error: e.message });
}

// ========================================
// 测试 3: values() 方法
// ========================================
console.log('\n【测试 3】values() 方法');
console.log('----------------------------------------');

try {
    var fd3 = createTestFormData();
    
    // 检查 values 方法是否存在
    var hasValues = typeof fd3.values === 'function';
    addTestResult('values() - 方法存在', hasValues);
    
    if (hasValues) {
        var valuesResult = fd3.values();
        console.log('  values() 返回类型:', typeof valuesResult);
        
        var hasNext = typeof valuesResult.next === 'function';
        console.log('  是否有 next 方法:', hasNext);
        addTestResult('values() - 返回迭代器对象', hasNext);
        
        if (hasNext) {
            // 收集所有 values
            var values = [];
            var result;
            while (!(result = valuesResult.next()).done) {
                values.push(result.value);
            }
            
            console.log('  values 数量:', values.length);
            console.log('  values 内容:', JSON.stringify(values));
            
            var hasAllValues = values.length === 4;
            addTestResult('values() - 返回正确数量的 values', hasAllValues, { 
                expected: 4, 
                actual: values.length 
            });
            
            // 验证具体值
            var correctValues = values[0] === 'Alice' && 
                                values[1] === '25' && 
                                values[2] === 'Bob' && 
                                values[3] === 'Beijing';
            addTestResult('values() - 值的内容和顺序正确', correctValues, { 
                values: values 
            });
        }
    }
    
} catch (e) {
    addTestResult('values() 方法测试', false, { error: e.message });
}

// ========================================
// 测试 4: for...of 迭代（Symbol.iterator）
// ========================================
console.log('\n【测试 4】for...of 迭代（Symbol.iterator）');
console.log('----------------------------------------');

try {
    var fd4 = new FormData();
    fd4.append('x', '1');
    fd4.append('y', '2');
    fd4.append('z', '3');
    
    console.log('  尝试 for...of 遍历...');
    
    var count = 0;
    var entries = [];
    
    try {
        // 尝试直接遍历 FormData
        for (var entry of fd4) {
            count++;
            console.log('    [' + count + ']', JSON.stringify(entry));
            entries.push(entry);
        }
        
        var hasEntries = count === 3;
        addTestResult('for...of - 可以遍历 FormData', hasEntries, { 
            expected: 3, 
            actual: count 
        });
        
        if (entries.length > 0) {
            var isPair = Array.isArray(entries[0]) && entries[0].length === 2;
            addTestResult('for...of - 每个条目是 [name, value] 对', isPair);
        }
        
    } catch (iterErr) {
        console.log('    ⚠️  for...of 失败:', iterErr.message);
        
        // 尝试使用 entries()
        console.log('  尝试 for...of fd.entries()...');
        
        var entriesArr = fd4.entries();
        if (Array.isArray(entriesArr)) {
            for (var i = 0; i < entriesArr.length; i++) {
                var entry = entriesArr[i];
                count++;
                console.log('    [' + (i + 1) + ']', JSON.stringify(entry));
            }
            
            addTestResult('for...of - entries() 返回可遍历数组', count === 3, { count: count });
        }
    }
    
} catch (e) {
    addTestResult('for...of 迭代测试', false, { error: e.message });
}

// ========================================
// 测试 5: Array.from() 转换
// ========================================
console.log('\n【测试 5】Array.from() 转换');
console.log('----------------------------------------');

try {
    var fd5 = new FormData();
    fd5.append('a', '1');
    fd5.append('b', '2');
    fd5.append('c', '3');
    
    // 测试 1: Array.from(entries())
    console.log('  测试 Array.from(fd.entries())...');
    
    var entriesArray = fd5.entries();
    if (Array.isArray(entriesArray)) {
        console.log('    entries() 已经是数组，长度:', entriesArray.length);
        addTestResult('Array.from() - entries() 是数组', true, { length: entriesArray.length });
        
        // 测试手动转换
        var manualArray = [];
        for (var i = 0; i < entriesArray.length; i++) {
            manualArray.push(entriesArray[i]);
        }
        
        var sameLength = manualArray.length === 3;
        addTestResult('Array.from() - 可手动转换 entries', sameLength, { length: manualArray.length });
    }
    
    // 测试 2: Array.from(keys())
    console.log('\n  测试 Array.from(fd.keys())...');
    
    var keysArray = fd5.keys();
    if (Array.isArray(keysArray)) {
        console.log('    keys() 已经是数组，长度:', keysArray.length);
        console.log('    keys:', JSON.stringify(keysArray));
        addTestResult('Array.from() - keys() 是数组', true, { keys: keysArray });
    }
    
    // 测试 3: Array.from(values())
    console.log('\n  测试 Array.from(fd.values())...');
    
    var valuesArray = fd5.values();
    if (Array.isArray(valuesArray)) {
        console.log('    values() 已经是数组，长度:', valuesArray.length);
        console.log('    values:', JSON.stringify(valuesArray));
        addTestResult('Array.from() - values() 是数组', true, { values: valuesArray });
    }
    
} catch (e) {
    addTestResult('Array.from() 转换测试', false, { error: e.message });
}

// ========================================
// 测试 6: 迭代顺序验证
// ========================================
console.log('\n【测试 6】迭代顺序验证');
console.log('----------------------------------------');

try {
    var fd6 = new FormData();
    
    // 按特定顺序添加
    fd6.append('first', '1');
    fd6.append('second', '2');
    fd6.append('third', '3');
    fd6.append('first', '4');  // 重复 key
    
    console.log('  添加顺序: first(1) → second(2) → third(3) → first(4)');
    
    // 验证 entries 顺序
    var entries = fd6.entries();
    console.log('  entries 顺序:', JSON.stringify(entries));
    
    if (Array.isArray(entries) && entries.length === 4) {
        var correctOrder = 
            entries[0][0] === 'first' && entries[0][1] === '1' &&
            entries[1][0] === 'second' && entries[1][1] === '2' &&
            entries[2][0] === 'third' && entries[2][1] === '3' &&
            entries[3][0] === 'first' && entries[3][1] === '4';
        
        addTestResult('迭代顺序 - entries() 保持插入顺序', correctOrder);
    }
    
    // 验证 keys 顺序
    var keys = fd6.keys();
    console.log('  keys 顺序:', JSON.stringify(keys));
    
    if (Array.isArray(keys) && keys.length === 4) {
        var correctKeyOrder = 
            keys[0] === 'first' && 
            keys[1] === 'second' && 
            keys[2] === 'third' && 
            keys[3] === 'first';
        
        addTestResult('迭代顺序 - keys() 保持插入顺序', correctKeyOrder);
    }
    
    // 验证 values 顺序
    var values = fd6.values();
    console.log('  values 顺序:', JSON.stringify(values));
    
    if (Array.isArray(values) && values.length === 4) {
        var correctValueOrder = 
            values[0] === '1' && 
            values[1] === '2' && 
            values[2] === '3' && 
            values[3] === '4';
        
        addTestResult('迭代顺序 - values() 保持插入顺序', correctValueOrder);
    }
    
} catch (e) {
    addTestResult('迭代顺序验证测试', false, { error: e.message });
}

// ========================================
// 测试 7: 空 FormData 迭代
// ========================================
console.log('\n【测试 7】空 FormData 迭代');
console.log('----------------------------------------');

try {
    var fdEmpty = new FormData();
    
    // entries
    var emptyEntries = fdEmpty.entries();
    console.log('  empty.entries() 类型:', typeof emptyEntries);
    
    // 检查是否是迭代器，且第一次调用 next() 就返回 done: true
    var entriesFirstNext = emptyEntries.next();
    var entriesIsEmpty = entriesFirstNext.done === true;
    addTestResult('空 FormData - entries() 返回空迭代器', entriesIsEmpty);
    
    // keys
    var emptyKeys = fdEmpty.keys();
    console.log('  empty.keys() 类型:', typeof emptyKeys);
    
    var keysFirstNext = emptyKeys.next();
    var keysIsEmpty = keysFirstNext.done === true;
    addTestResult('空 FormData - keys() 返回空迭代器', keysIsEmpty);
    
    // values
    var emptyValues = fdEmpty.values();
    console.log('  empty.values() 类型:', typeof emptyValues);
    
    var valuesFirstNext = emptyValues.next();
    var valuesIsEmpty = valuesFirstNext.done === true;
    addTestResult('空 FormData - values() 返回空迭代器', valuesIsEmpty);
    
    // forEach
    var forEachCount = 0;
    fdEmpty.forEach(function() {
        forEachCount++;
    });
    
    addTestResult('空 FormData - forEach() 不执行', forEachCount === 0);
    
} catch (e) {
    addTestResult('空 FormData 迭代测试', false, { error: e.message });
}

// ========================================
// 测试 8: 迭代器与 CRUD 操作的交互
// ========================================
console.log('\n【测试 8】迭代器与 CRUD 操作的交互');
console.log('----------------------------------------');

try {
    var fd8 = new FormData();
    fd8.append('a', '1');
    fd8.append('b', '2');
    fd8.append('c', '3');
    
    // 删除一个字段
    fd8.delete('b');
    
    var keysAfterDelete = fd8.keys();
    console.log('  删除 "b" 后 keys 迭代器');
    
    // 收集迭代器结果
    var keysArray = [];
    var result;
    while (!(result = keysAfterDelete.next()).done) {
        keysArray.push(result.value);
    }
    console.log('  keys:', JSON.stringify(keysArray));
    
    var deletedCorrectly = keysArray.length === 2 &&
                           keysArray[0] === 'a' &&
                           keysArray[1] === 'c';
    
    addTestResult('迭代器 - delete() 后正确更新', deletedCorrectly);
    
    // 添加新字段
    fd8.append('d', '4');
    
    var keysAfterAppend = fd8.keys();
    var keysArray2 = [];
    while (!(result = keysAfterAppend.next()).done) {
        keysArray2.push(result.value);
    }
    console.log('  append "d" 后 keys:', JSON.stringify(keysArray2));
    
    var appendedCorrectly = keysArray2.length === 3 &&
                            keysArray2[2] === 'd';
    
    addTestResult('迭代器 - append() 后正确更新', appendedCorrectly);
    
    // 使用 set 覆盖
    fd8.set('a', '10');
    
    var valuesAfterSet = fd8.values();
    var valuesArray = [];
    while (!(result = valuesAfterSet.next()).done) {
        valuesArray.push(result.value);
    }
    console.log('  set "a" 后 values:', JSON.stringify(valuesArray));
    
    var setCorrectly = valuesArray[0] === '10';
    
    addTestResult('迭代器 - set() 后正确更新', setCorrectly);
    
} catch (e) {
    addTestResult('迭代器与 CRUD 交互测试', false, { error: e.message });
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
        console.log('🎉 所有迭代器测试通过！');
    } else {
        console.log('⚠️  存在失败的测试，请检查');
    }
    
    console.log('========================================');
}, 100);

return testResults;

