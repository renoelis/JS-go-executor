/**
 * Fetch API - URLSearchParams 完整测试
 * 
 * 测试目标：
 * 1. URLSearchParams 构造器（多种方式）
 * 2. 基本方法：append/set/get/getAll/has/delete
 * 3. 迭代器：entries/keys/values/forEach
 * 4. toString() 方法
 * 5. 与 fetch 集成
 */

console.log('========================================');
console.log('Fetch API - URLSearchParams 完整测试');
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
// 测试 1: URLSearchParams 构造器 - 字符串
// ========================================
function test1_Constructor_String() {
    console.log('\n【测试 1】URLSearchParams 构造器 - 字符串');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams('name=John&age=30&city=Beijing');
        
        console.log('  创建参数:', 'name=John&age=30&city=Beijing');
        
        var exists = params !== null && params !== undefined;
        addTestResult('URLSearchParams - 字符串构造器', exists);
        
        if (!exists) return { success: false };
        
        // 验证参数正确解析
        var name = params.get('name');
        var age = params.get('age');
        var city = params.get('city');
        
        console.log('  name:', name);
        console.log('  age:', age);
        console.log('  city:', city);
        
        var valuesCorrect = name === 'John' && age === '30' && city === 'Beijing';
        addTestResult('URLSearchParams - 字符串解析正确', valuesCorrect, {
            name: name,
            age: age,
            city: city
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams - 字符串构造器', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 2: URLSearchParams 构造器 - 对象
// ========================================
function test2_Constructor_Object() {
    console.log('\n【测试 2】URLSearchParams 构造器 - 对象');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams({
            name: 'Alice',
            age: 25,
            active: true
        });
        
        console.log('  创建参数: {name: "Alice", age: 25, active: true}');
        
        var exists = params !== null && params !== undefined;
        addTestResult('URLSearchParams - 对象构造器', exists);
        
        if (!exists) return { success: false };
        
        // 验证参数
        var name = params.get('name');
        var age = params.get('age');
        var active = params.get('active');
        
        console.log('  name:', name);
        console.log('  age:', age);
        console.log('  active:', active);
        
        // 数字和布尔值应该转为字符串
        var valuesCorrect = name === 'Alice' && age === '25' && active === 'true';
        addTestResult('URLSearchParams - 对象解析正确', valuesCorrect, {
            name: name,
            age: age,
            active: active
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams - 对象构造器', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 3: URLSearchParams 构造器 - 数组
// ========================================
function test3_Constructor_Array() {
    console.log('\n【测试 3】URLSearchParams 构造器 - 数组');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams([
            ['name', 'Bob'],
            ['age', '35'],
            ['skill', 'JavaScript'],
            ['skill', 'Go']
        ]);
        
        console.log('  创建参数: [["name", "Bob"], ["age", "35"], ...]');
        
        var exists = params !== null && params !== undefined;
        addTestResult('URLSearchParams - 数组构造器', exists);
        
        if (!exists) return { success: false };
        
        // 验证参数
        var name = params.get('name');
        var skills = params.getAll('skill');
        
        console.log('  name:', name);
        console.log('  skills:', skills);
        
        var nameCorrect = name === 'Bob';
        var skillsCorrect = skills && skills.length === 2 && 
                           skills[0] === 'JavaScript' && skills[1] === 'Go';
        
        addTestResult('URLSearchParams - 数组解析正确', nameCorrect && skillsCorrect, {
            name: name,
            skills: skills
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams - 数组构造器', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 4: append() 方法
// ========================================
function test4_Append() {
    console.log('\n【测试 4】append() 方法');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams();
        
        params.append('hobby', 'reading');
        params.append('hobby', 'coding');
        params.append('hobby', 'gaming');
        
        console.log('  添加了 3 个 hobby');
        
        var hobbies = params.getAll('hobby');
        console.log('  hobbies:', hobbies);
        
        var correct = hobbies && hobbies.length === 3 &&
                     hobbies[0] === 'reading' &&
                     hobbies[1] === 'coding' &&
                     hobbies[2] === 'gaming';
        
        addTestResult('URLSearchParams.append() - 重复键', correct, {
            expected: ['reading', 'coding', 'gaming'],
            actual: hobbies
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.append()', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 5: set() 方法
// ========================================
function test5_Set() {
    console.log('\n【测试 5】set() 方法');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams();
        
        params.append('status', 'draft');
        params.append('status', 'review');
        console.log('  添加了 2 个 status');
        
        params.set('status', 'published');
        console.log('  set status to "published"');
        
        var statuses = params.getAll('status');
        console.log('  statuses:', statuses);
        
        // set() 应该替换所有同名参数
        var correct = statuses && statuses.length === 1 && statuses[0] === 'published';
        
        addTestResult('URLSearchParams.set() - 替换所有值', correct, {
            expected: ['published'],
            actual: statuses
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.set()', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 6: has() 和 delete() 方法
// ========================================
function test6_HasAndDelete() {
    console.log('\n【测试 6】has() 和 delete() 方法');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams('name=John&age=30');
        
        console.log('  初始参数: name=John&age=30');
        
        var hasName = params.has('name');
        var hasAge = params.has('age');
        var hasCity = params.has('city');
        
        console.log('  has("name"):', hasName);
        console.log('  has("age"):', hasAge);
        console.log('  has("city"):', hasCity);
        
        addTestResult('URLSearchParams.has() - 存在的键', hasName && hasAge);
        addTestResult('URLSearchParams.has() - 不存在的键', !hasCity);
        
        // 删除 age
        params.delete('age');
        console.log('  delete("age")');
        
        var hasAgeAfter = params.has('age');
        console.log('  has("age") after delete:', hasAgeAfter);
        
        addTestResult('URLSearchParams.delete() - 正确删除', !hasAgeAfter);
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.has/delete', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 7: toString() 方法
// ========================================
function test7_ToString() {
    console.log('\n【测试 7】toString() 方法');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams({
            name: 'John Doe',
            age: 30,
            city: 'New York'
        });
        
        var str = params.toString();
        console.log('  toString():', str);
        
        // 验证是否是有效的查询字符串
        var hasName = str.indexOf('name=') !== -1;
        var hasAge = str.indexOf('age=') !== -1;
        var hasCity = str.indexOf('city=') !== -1;
        
        addTestResult('URLSearchParams.toString() - 包含所有参数', 
            hasName && hasAge && hasCity, {
            string: str
        });
        
        // 验证空格编码为 +
        var hasEncodedSpace = str.indexOf('John+Doe') !== -1 || str.indexOf('John%20Doe') !== -1;
        addTestResult('URLSearchParams.toString() - 空格正确编码', hasEncodedSpace, {
            encoded: str.indexOf('John+Doe') !== -1 ? 'John+Doe' : 'John%20Doe'
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.toString()', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 8: entries() 迭代器
// ========================================
function test8_Entries() {
    console.log('\n【测试 8】entries() 迭代器');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams('a=1&b=2&c=3');
        
        var entries = [];
        var iterator = params.entries();
        
        if (!iterator || !iterator.next) {
            addTestResult('URLSearchParams.entries() - 方法存在', false, {
                error: 'entries() 未返回迭代器'
            });
            return { success: false };
        }
        
        addTestResult('URLSearchParams.entries() - 方法存在', true);
        
        var entry;
        var count = 0;
        while ((entry = iterator.next()) && !entry.done) {
            count++;
            console.log('  条目', count, ':', entry.value[0], '=', entry.value[1]);
            entries.push(entry.value);
        }
        
        addTestResult('URLSearchParams.entries() - 迭代所有条目', count === 3, {
            expected: 3,
            actual: count,
            entries: entries
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.entries()', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 9: forEach() 方法
// ========================================
function test9_ForEach() {
    console.log('\n【测试 9】forEach() 方法');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams('x=10&y=20&z=30');
        
        var entries = [];
        var count = 0;
        
        params.forEach(function(value, key, parent) {
            count++;
            console.log('  条目', count, ':', key, '=', value);
            console.log('    parent === params:', parent === params);
            entries.push({ key: key, value: value, parentCorrect: parent === params });
        });
        
        addTestResult('URLSearchParams.forEach() - 遍历所有', count === 3, {
            expected: 3,
            actual: count
        });
        
        var allParentCorrect = entries.every(function(e) { return e.parentCorrect; });
        addTestResult('URLSearchParams.forEach() - parent 参数正确', allParentCorrect);
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams.forEach()', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 10: 与 fetch 集成 - GET 请求
// ========================================
function test10_FetchIntegration_GET() {
    console.log('\n【测试 10】与 fetch 集成 - GET 请求');
    console.log('----------------------------------------');
    
    var params = new URLSearchParams({
        name: 'Test User',
        age: 28,
        city: 'Shanghai'
    });
    
    var url = 'https://httpbin.org/get?' + params.toString();
    console.log('  URL:', url);
    
    return fetch(url)
        .then(function(response) {
            console.log('  Status:', response.status);
            return response.json();
        })
        .then(function(data) {
            console.log('  Query params:', JSON.stringify(data.args, null, 2));
            
            var argsCorrect = data.args && 
                             data.args.name === 'Test User' &&
                             data.args.age === '28' &&
                             data.args.city === 'Shanghai';
            
            addTestResult('URLSearchParams + fetch GET - 参数正确发送', argsCorrect, {
                sent: { name: 'Test User', age: 28, city: 'Shanghai' },
                received: data.args
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('URLSearchParams + fetch GET', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 11: 与 fetch 集成 - POST 请求
// ========================================
function test11_FetchIntegration_POST() {
    console.log('\n【测试 11】与 fetch 集成 - POST 请求');
    console.log('----------------------------------------');
    
    var params = new URLSearchParams({
        username: 'testuser',
        password: 'secret123',
        remember: true
    });
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        body: params
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        return response.json();
    })
    .then(function(data) {
        console.log('  Content-Type:', data.headers['Content-Type']);
        console.log('  Form data:', JSON.stringify(data.form, null, 2));
        
        // 验证 Content-Type
        var contentTypeCorrect = data.headers && 
            data.headers['Content-Type'] && 
            data.headers['Content-Type'].indexOf('application/x-www-form-urlencoded') !== -1;
        
        addTestResult('URLSearchParams + fetch POST - Content-Type', contentTypeCorrect, {
            contentType: data.headers['Content-Type']
        });
        
        // 验证表单数据
        var formCorrect = data.form &&
                         data.form.username === 'testuser' &&
                         data.form.password === 'secret123' &&
                         data.form.remember === 'true';
        
        addTestResult('URLSearchParams + fetch POST - 数据正确', formCorrect, {
            sent: { username: 'testuser', password: 'secret123', remember: true },
            received: data.form
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams + fetch POST', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 12: 特殊字符编码
// ========================================
function test12_SpecialCharacters() {
    console.log('\n【测试 12】特殊字符编码');
    console.log('----------------------------------------');
    
    try {
        var params = new URLSearchParams();
        params.append('email', 'user@example.com');
        params.append('message', 'Hello & welcome!');
        params.append('url', 'https://example.com/path?a=1&b=2');
        
        var str = params.toString();
        console.log('  toString():', str);
        
        // @ 应该被编码为 %40
        var hasEncodedAt = str.indexOf('%40') !== -1;
        // & 应该保留为分隔符，message 中的 & 应该被编码
        var hasEncodedAmp = str.indexOf('%26') !== -1;
        
        addTestResult('URLSearchParams - 特殊字符编码', hasEncodedAt || hasEncodedAmp, {
            string: str,
            hasEncodedAt: hasEncodedAt,
            hasEncodedAmp: hasEncodedAmp
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('URLSearchParams - 特殊字符编码', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

test1_Constructor_String();
test2_Constructor_Object();
test3_Constructor_Array();
test4_Append();
test5_Set();
test6_HasAndDelete();
test7_ToString();
test8_Entries();
test9_ForEach();
test12_SpecialCharacters();

// 异步测试
test10_FetchIntegration_GET()
    .then(function() { return test11_FetchIntegration_POST(); })
    .then(function() {
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
            
            testResults;
        }, 100);
    })
    .catch(function(error) {
        console.log('\n测试流程出错:', error);
    });

// 返回测试结果
return testResults;


