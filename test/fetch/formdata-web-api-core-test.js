    /**
     * Web API FormData 核心方法测试
     * 
     * 测试目标：
     * 1. append() 方法 - 添加字段（可重复）
     * 2. set() 方法 - 设置字段（覆盖）
     * 3. get() 方法 - 获取第一个值
     * 4. getAll() 方法 - 获取所有值
     * 5. has() 方法 - 检查字段是否存在
     * 6. delete() 方法 - 删除字段
     * 7. forEach() 方法 - 遍历所有字段
     * 8. append() vs set() 行为差异
     */

    console.log('========================================');
    console.log('Web API FormData 核心方法测试');
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
    // 测试 1: append() 方法
    // ========================================
    console.log('\n【测试 1】append() 方法');
    console.log('----------------------------------------');

    try {
        var fd1 = new FormData();
        
        // 基础 append
        fd1.append('field1', 'value1');
        addTestResult('append() - 添加单个字段', true, { value: 'value1' });
        
        // 重复 append（关键行为）
        fd1.append('field1', 'value2');
        fd1.append('field1', 'value3');
        addTestResult('append() - 允许重复添加', true, { count: 3 });
        
        // append 不同类型
        fd1.append('number', 123);
        fd1.append('boolean', true);
        fd1.append('null', null);
        fd1.append('undefined', undefined);
        addTestResult('append() - 支持多种数据类型', true);
        
    } catch (e) {
        addTestResult('append() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 2: get() 方法
    // ========================================
    console.log('\n【测试 2】get() 方法');
    console.log('----------------------------------------');

    try {
        var fd2 = new FormData();
        fd2.append('name', 'Alice');
        fd2.append('name', 'Bob');
        fd2.append('name', 'Charlie');
        
        // 获取第一个值
        var firstValue = fd2.get('name');
        console.log('  get("name") 返回:', firstValue);
        
        var isFirstValue = firstValue === 'Alice';
        addTestResult('get() - 返回第一个值', isFirstValue, { 
            expected: 'Alice', 
            actual: firstValue 
        });
        
        // 获取不存在的字段
        var nonExistent = fd2.get('nonexistent');
        console.log('  get("nonexistent") 返回:', nonExistent);
        
        var isNull = nonExistent === null;
        addTestResult('get() - 不存在的字段返回 null', isNull, { 
            expected: 'null', 
            actual: String(nonExistent) 
        });
        
    } catch (e) {
        addTestResult('get() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 3: getAll() 方法
    // ========================================
    console.log('\n【测试 3】getAll() 方法');
    console.log('----------------------------------------');

    try {
        var fd3 = new FormData();
        fd3.append('colors', 'red');
        fd3.append('colors', 'green');
        fd3.append('colors', 'blue');
        
        // 获取所有值
        var allColors = fd3.getAll('colors');
        console.log('  getAll("colors") 返回:', JSON.stringify(allColors));
        
        var isArray = Array.isArray(allColors);
        addTestResult('getAll() - 返回数组', isArray);
        
        var hasAllValues = allColors.length === 3 && 
                        allColors[0] === 'red' && 
                        allColors[1] === 'green' && 
                        allColors[2] === 'blue';
        addTestResult('getAll() - 包含所有值', hasAllValues, { 
            expected: ['red', 'green', 'blue'], 
            actual: allColors 
        });
        
        // 获取不存在的字段
        var emptyArray = fd3.getAll('nonexistent');
        console.log('  getAll("nonexistent") 返回:', JSON.stringify(emptyArray));
        
        var isEmpty = Array.isArray(emptyArray) && emptyArray.length === 0;
        addTestResult('getAll() - 不存在的字段返回空数组', isEmpty, { 
            expected: [], 
            actual: emptyArray 
        });
        
    } catch (e) {
        addTestResult('getAll() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 4: set() 方法（覆盖行为）
    // ========================================
    console.log('\n【测试 4】set() 方法');
    console.log('----------------------------------------');

    try {
        var fd4 = new FormData();
        
        // 初始添加多个值
        fd4.append('field', 'value1');
        fd4.append('field', 'value2');
        fd4.append('field', 'value3');
        
        var beforeSet = fd4.getAll('field');
        console.log('  set 之前:', JSON.stringify(beforeSet));
        
        // 使用 set 覆盖
        fd4.set('field', 'newValue');
        
        var afterSet = fd4.getAll('field');
        console.log('  set 之后:', JSON.stringify(afterSet));
        
        var isOverwritten = afterSet.length === 1 && afterSet[0] === 'newValue';
        addTestResult('set() - 覆盖所有同名字段', isOverwritten, { 
            before: beforeSet.length, 
            after: afterSet.length, 
            value: afterSet[0] 
        });
        
        // set 不存在的字段
        fd4.set('newField', 'newValue');
        var newFieldValue = fd4.get('newField');
        
        var canSetNew = newFieldValue === 'newValue';
        addTestResult('set() - 可以设置新字段', canSetNew, { 
            value: newFieldValue 
        });
        
    } catch (e) {
        addTestResult('set() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 5: has() 方法
    // ========================================
    console.log('\n【测试 5】has() 方法');
    console.log('----------------------------------------');

    try {
        var fd5 = new FormData();
        fd5.append('username', 'Alice');
        
        // 检查存在的字段
        var hasUsername = fd5.has('username');
        console.log('  has("username"):', hasUsername);
        
        addTestResult('has() - 检查存在的字段', hasUsername === true);
        
        // 检查不存在的字段
        var hasPassword = fd5.has('password');
        console.log('  has("password"):', hasPassword);
        
        addTestResult('has() - 检查不存在的字段', hasPassword === false);
        
        // 检查类型
        var isBoolean = typeof hasUsername === 'boolean';
        addTestResult('has() - 返回布尔值', isBoolean);
        
    } catch (e) {
        addTestResult('has() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 6: delete() 方法
    // ========================================
    console.log('\n【测试 6】delete() 方法');
    console.log('----------------------------------------');

    try {
        var fd6 = new FormData();
        fd6.append('field1', 'value1');
        fd6.append('field1', 'value2');
        fd6.append('field2', 'value3');
        
        console.log('  删除前 has("field1"):', fd6.has('field1'));
        console.log('  删除前 getAll("field1"):', JSON.stringify(fd6.getAll('field1')));
        
        // 删除字段
        fd6.delete('field1');
        
        console.log('  删除后 has("field1"):', fd6.has('field1'));
        console.log('  删除后 getAll("field1"):', JSON.stringify(fd6.getAll('field1')));
        
        var isDeleted = fd6.has('field1') === false && 
                        fd6.getAll('field1').length === 0;
        addTestResult('delete() - 删除所有同名字段', isDeleted);
        
        // 验证其他字段未受影响
        var field2Exists = fd6.has('field2');
        addTestResult('delete() - 不影响其他字段', field2Exists);
        
        // 删除不存在的字段（不应报错）
        try {
            fd6.delete('nonexistent');
            addTestResult('delete() - 删除不存在的字段不报错', true);
        } catch (delErr) {
            addTestResult('delete() - 删除不存在的字段不报错', false, { error: delErr.message });
        }
        
    } catch (e) {
        addTestResult('delete() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 7: forEach() 方法
    // ========================================
    console.log('\n【测试 7】forEach() 方法');
    console.log('----------------------------------------');

    try {
        var fd7 = new FormData();
        fd7.append('name', 'Alice');
        fd7.append('age', '25');
        fd7.append('name', 'Bob');
        
        console.log('  遍历结果:');
        
        var count = 0;
        var entries = [];
        
        fd7.forEach(function(value, key, parent) {
            count++;
            console.log('    [' + count + '] key=' + key + ', value=' + value);
            entries.push({ key: key, value: value });
            
            // 验证 parent 是 FormData 对象
            if (count === 1) {
                var isFormData = parent === fd7;
                addTestResult('forEach() - callback 第三个参数是 FormData 本身', isFormData);
            }
        });
        
        var hasAllEntries = count === 3;
        addTestResult('forEach() - 遍历所有条目（包括重复）', hasAllEntries, { 
            expected: 3, 
            actual: count 
        });
        
        // 验证顺序（重要！）
        var correctOrder = entries[0].key === 'name' && 
                        entries[1].key === 'age' && 
                        entries[2].key === 'name';
        addTestResult('forEach() - 保持插入顺序', correctOrder);
        
    } catch (e) {
        addTestResult('forEach() 方法测试', false, { error: e.message });
    }

    // ========================================
    // 测试 8: append() vs set() 行为对比
    // ========================================
    console.log('\n【测试 8】append() vs set() 行为对比');
    console.log('----------------------------------------');

    try {
        console.log('  场景 1: 连续使用 append()');
        var fdAppend = new FormData();
        fdAppend.append('tags', 'javascript');
        fdAppend.append('tags', 'nodejs');
        fdAppend.append('tags', 'goja');
        
        var appendResult = fdAppend.getAll('tags');
        console.log('    结果:', JSON.stringify(appendResult));
        
        var appendCorrect = appendResult.length === 3;
        addTestResult('append() - 累积添加', appendCorrect, { count: appendResult.length });
        
        console.log('\n  场景 2: 先 append 后 set');
        var fdMixed = new FormData();
        fdMixed.append('tags', 'javascript');
        fdMixed.append('tags', 'nodejs');
        fdMixed.set('tags', 'goja');  // 覆盖前两个
        
        var mixedResult = fdMixed.getAll('tags');
        console.log('    结果:', JSON.stringify(mixedResult));
        
        var setOverwrites = mixedResult.length === 1 && mixedResult[0] === 'goja';
        addTestResult('set() - 覆盖之前的 append', setOverwrites, { 
            expected: ['goja'], 
            actual: mixedResult 
        });
        
        console.log('\n  场景 3: 先 set 后 append');
        var fdReverse = new FormData();
        fdReverse.set('tags', 'javascript');
        fdReverse.append('tags', 'nodejs');
        fdReverse.append('tags', 'goja');
        
        var reverseResult = fdReverse.getAll('tags');
        console.log('    结果:', JSON.stringify(reverseResult));
        
        var appendAfterSet = reverseResult.length === 3;
        addTestResult('append() - 可在 set 后继续添加', appendAfterSet, { count: reverseResult.length });
        
    } catch (e) {
        addTestResult('append() vs set() 测试', false, { error: e.message });
    }

    // ========================================
    // 测试 9: 参数验证和错误处理
    // ========================================
    console.log('\n【测试 9】参数验证和错误处理');
    console.log('----------------------------------------');

    try {
        var fd9 = new FormData();
        
        // 测试 1: append 缺少参数
        try {
            fd9.append('field1');  // 缺少 value
            addTestResult('append() - 缺少参数应抛出错误', false, { error: '未抛出错误' });
        } catch (err) {
            var isTypeError = err.name === 'TypeError' || err.message.indexOf('requires') !== -1;
            addTestResult('append() - 缺少参数抛出 TypeError', isTypeError, { 
                errorName: err.name, 
                errorMessage: err.message 
            });
        }
        
        // 测试 2: set 缺少参数
        try {
            fd9.set('field1');  // 缺少 value
            addTestResult('set() - 缺少参数应抛出错误', false, { error: '未抛出错误' });
        } catch (err) {
            var isTypeError = err.name === 'TypeError' || err.message.indexOf('requires') !== -1;
            addTestResult('set() - 缺少参数抛出 TypeError', isTypeError, { 
                errorName: err.name, 
                errorMessage: err.message 
            });
        }
        
    } catch (e) {
        addTestResult('参数验证测试', false, { error: e.message });
    }

    // ========================================
    // 测试 10: 数据类型转换
    // ========================================
    console.log('\n【测试 10】数据类型转换');
    console.log('----------------------------------------');

    try {
        var fd10 = new FormData();
        
        // 数字
        fd10.append('number', 123);
        var numberValue = fd10.get('number');
        console.log('  number (123) → "' + numberValue + '"');
        addTestResult('类型转换 - number → string', numberValue === '123');
        
        // 布尔值
        fd10.append('boolean', true);
        var boolValue = fd10.get('boolean');
        console.log('  boolean (true) → "' + boolValue + '"');
        addTestResult('类型转换 - boolean → string', boolValue === 'true');
        
        // null
        fd10.append('null', null);
        var nullValue = fd10.get('null');
        console.log('  null → "' + nullValue + '"');
        addTestResult('类型转换 - null → string', nullValue === 'null');
        
        // undefined
        fd10.append('undefined', undefined);
        var undefinedValue = fd10.get('undefined');
        console.log('  undefined → "' + undefinedValue + '"');
        addTestResult('类型转换 - undefined → string', undefinedValue === 'undefined');
        
        // 对象
        fd10.append('object', { a: 1, b: 2 });
        var objectValue = fd10.get('object');
        console.log('  object {a:1, b:2} → "' + objectValue + '"');
        addTestResult('类型转换 - object → string', objectValue === '[object Object]');
        
    } catch (e) {
        addTestResult('数据类型转换测试', false, { error: e.message });
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
            console.log('🎉 所有测试通过！');
        } else {
            console.log('⚠️  存在失败的测试，请检查');
        }
        
        console.log('========================================');
    }, 100);

    return testResults;

