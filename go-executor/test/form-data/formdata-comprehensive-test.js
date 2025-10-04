/**
 * FormData 综合测试 - Node.js v22.2.0 标准
 * 
 * 测试范围:
 * 1. Node.js FormData (require('form-data'))
 * 2. Web API FormData (全局 FormData)
 * 3. 所有功能测试
 * 4. 所有错误场景测试
 */

console.log('============================================================');
console.log('FormData 综合测试 (Node.js v22.2.0 标准)');
console.log('============================================================\n');

const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    sections: {
        nodejs: { passed: 0, failed: 0 },
        webapi: { passed: 0, failed: 0 },
        errors: { passed: 0, failed: 0 }
    }
};

function addTest(name, success, message, section) {
    const result = { name, success, message: message || '' };
    testResults.tests.push(result);
    
    if (success) {
        testResults.passed++;
        if (section) testResults.sections[section].passed++;
        console.log('  ✅ ' + name);
    } else {
        testResults.failed++;
        if (section) testResults.sections[section].failed++;
        console.log('  ❌ ' + name + (message ? ': ' + message : ''));
    }
}

// ============================================================
// Part 1: Node.js FormData 功能测试
// ============================================================
console.log('\n【Part 1】Node.js FormData 功能测试');
console.log('------------------------------------------------------------');

try {
    const FormData = require('form-data');
    
    // 测试 1.1: 创建实例
    console.log('\n=== 测试 1.1: 创建 FormData 实例 ===');
    try {
        const form = new FormData();
        addTest('Node.js FormData 实例创建', typeof form === 'object', null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData 实例创建', false, e.message, 'nodejs');
    }
    
    // 测试 1.2: append() 方法 - 字符串
    console.log('\n=== 测试 1.2: append() - 字符串 ===');
    try {
        const form = new FormData();
        form.append('name', 'John Doe');
        form.append('email', 'john@example.com');
        form.append('age', '30');
        addTest('Node.js FormData append 字符串', true, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData append 字符串', false, e.message, 'nodejs');
    }
    
    // 测试 1.3: append() 方法 - Buffer
    console.log('\n=== 测试 1.3: append() - Buffer ===');
    try {
        const form = new FormData();
        const Buffer = require('buffer').Buffer;
        const buffer = Buffer.from('Hello World', 'utf8');
        form.append('file', buffer, 'test.txt');
        addTest('Node.js FormData append Buffer', true, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData append Buffer', false, e.message, 'nodejs');
    }
    
    // 测试 1.4: append() 方法 - Blob
    console.log('\n=== 测试 1.4: append() - Blob ===');
    try {
        const form = new FormData();
        const blob = new Blob(['Hello Blob'], { type: 'text/plain' });
        form.append('blobfile', blob, 'blob.txt');
        addTest('Node.js FormData append Blob', true, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData append Blob', false, e.message, 'nodejs');
    }
    
    // 测试 1.5: append() 方法 - File
    console.log('\n=== 测试 1.5: append() - File ===');
    try {
        const form = new FormData();
        const file = new File(['Hello File'], 'file.txt', { type: 'text/plain' });
        form.append('upload', file);
        addTest('Node.js FormData append File', true, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData append File', false, e.message, 'nodejs');
    }
    
    // 测试 1.6: getHeaders() 方法
    console.log('\n=== 测试 1.6: getHeaders() ===');
    try {
        const form = new FormData();
        form.append('test', 'value');
        const headers = form.getHeaders();
        const hasContentType = headers && headers['content-type'];
        const hasBoundary = hasContentType && hasContentType.indexOf('boundary=') !== -1;
        addTest('Node.js FormData getHeaders', hasBoundary, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData getHeaders', false, e.message, 'nodejs');
    }
    
    // 测试 1.7: getBoundary() 方法
    console.log('\n=== 测试 1.7: getBoundary() ===');
    try {
        const form = new FormData();
        const boundary = form.getBoundary();
        addTest('Node.js FormData getBoundary', typeof boundary === 'string' && boundary.length > 0, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData getBoundary', false, e.message, 'nodejs');
    }
    
    // 测试 1.8: setBoundary() 方法
    console.log('\n=== 测试 1.8: setBoundary() ===');
    try {
        const form = new FormData();
        form.setBoundary('custom-boundary-123');
        const boundary = form.getBoundary();
        addTest('Node.js FormData setBoundary', boundary === 'custom-boundary-123', null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData setBoundary', false, e.message, 'nodejs');
    }
    
    // 测试 1.9: getLength() 方法
    console.log('\n=== 测试 1.9: getLength() ===');
    try {
        const form = new FormData();
        form.append('name', 'test');
        let lengthReceived = false;
        form.getLength(function(err, length) {
            lengthReceived = true;
            addTest('Node.js FormData getLength', !err && typeof length === 'number', null, 'nodejs');
        });
        if (!lengthReceived) {
            addTest('Node.js FormData getLength', false, 'callback 未被调用', 'nodejs');
        }
    } catch (e) {
        addTest('Node.js FormData getLength', false, e.message, 'nodejs');
    }
    
    // 测试 1.10: getBuffer() 方法
    console.log('\n=== 测试 1.10: getBuffer() ===');
    try {
        const form = new FormData();
        form.append('test', 'value');
        const buffer = form.getBuffer();
        const Buffer = require('buffer').Buffer;
        addTest('Node.js FormData getBuffer', Buffer.isBuffer(buffer), null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData getBuffer', false, e.message, 'nodejs');
    }
    
    // 测试 1.11: 多个同名字段
    console.log('\n=== 测试 1.11: 多个同名字段 ===');
    try {
        const form = new FormData();
        form.append('tags', 'tag1');
        form.append('tags', 'tag2');
        form.append('tags', 'tag3');
        const buffer = form.getBuffer();
        const content = buffer.toString('utf8');
        const tag1Count = (content.match(/tag1/g) || []).length;
        const tag2Count = (content.match(/tag2/g) || []).length;
        const tag3Count = (content.match(/tag3/g) || []).length;
        addTest('Node.js FormData 多个同名字段', tag1Count >= 1 && tag2Count >= 1 && tag3Count >= 1, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData 多个同名字段', false, e.message, 'nodejs');
    }
    
    // 测试 1.12: 复杂数据组合
    console.log('\n=== 测试 1.12: 复杂数据组合 ===');
    try {
        const form = new FormData();
        const Buffer = require('buffer').Buffer;
        
        form.append('text', 'Hello World');
        form.append('number', '42');
        form.append('buffer', Buffer.from('Buffer Data'), 'data.bin');
        form.append('blob', new Blob(['Blob Data']), 'blob.dat');
        form.append('file', new File(['File Data'], 'file.txt', { type: 'text/plain' }));
        
        const buffer = form.getBuffer();
        addTest('Node.js FormData 复杂数据组合', buffer.length > 0, null, 'nodejs');
    } catch (e) {
        addTest('Node.js FormData 复杂数据组合', false, e.message, 'nodejs');
    }
    
} catch (e) {
    console.log('❌ Node.js FormData 模块加载失败:', e.message);
}

// ============================================================
// Part 2: Web API FormData 功能测试
// ============================================================
console.log('\n【Part 2】Web API FormData 功能测试');
console.log('------------------------------------------------------------');

try {
    // 测试 2.1: 创建实例
    console.log('\n=== 测试 2.1: 创建 FormData 实例 ===');
    try {
        const form = new FormData();
        addTest('Web FormData 实例创建', typeof form === 'object', null, 'webapi');
    } catch (e) {
        addTest('Web FormData 实例创建', false, e.message, 'webapi');
    }
    
    // 测试 2.2: append() 方法
    console.log('\n=== 测试 2.2: append() 方法 ===');
    try {
        const form = new FormData();
        form.append('name', 'John');
        form.append('email', 'john@test.com');
        addTest('Web FormData append', true, null, 'webapi');
    } catch (e) {
        addTest('Web FormData append', false, e.message, 'webapi');
    }
    
    // 测试 2.3: get() 方法
    console.log('\n=== 测试 2.3: get() 方法 ===');
    try {
        const form = new FormData();
        form.append('username', 'testuser');
        const value = form.get('username');
        addTest('Web FormData get', value === 'testuser', null, 'webapi');
    } catch (e) {
        addTest('Web FormData get', false, e.message, 'webapi');
    }
    
    // 测试 2.4: getAll() 方法
    console.log('\n=== 测试 2.4: getAll() 方法 ===');
    try {
        const form = new FormData();
        form.append('hobby', 'reading');
        form.append('hobby', 'coding');
        form.append('hobby', 'gaming');
        const values = form.getAll('hobby');
        addTest('Web FormData getAll', Array.isArray(values) && values.length === 3, null, 'webapi');
    } catch (e) {
        addTest('Web FormData getAll', false, e.message, 'webapi');
    }
    
    // 测试 2.5: has() 方法
    console.log('\n=== 测试 2.5: has() 方法 ===');
    try {
        const form = new FormData();
        form.append('field1', 'value1');
        const exists = form.has('field1');
        const notExists = form.has('field2');
        addTest('Web FormData has', exists === true && notExists === false, null, 'webapi');
    } catch (e) {
        addTest('Web FormData has', false, e.message, 'webapi');
    }
    
    // 测试 2.6: set() 方法
    console.log('\n=== 测试 2.6: set() 方法 ===');
    try {
        const form = new FormData();
        form.append('name', 'first');
        form.append('name', 'second');
        form.set('name', 'replaced');
        const values = form.getAll('name');
        addTest('Web FormData set', values.length === 1 && values[0] === 'replaced', null, 'webapi');
    } catch (e) {
        addTest('Web FormData set', false, e.message, 'webapi');
    }
    
    // 测试 2.7: delete() 方法
    console.log('\n=== 测试 2.7: delete() 方法 ===');
    try {
        const form = new FormData();
        form.append('temp', 'value');
        form.append('keep', 'keepme');
        form.delete('temp');
        const hasTemp = form.has('temp');
        const hasKeep = form.has('keep');
        addTest('Web FormData delete', hasTemp === false && hasKeep === true, null, 'webapi');
    } catch (e) {
        addTest('Web FormData delete', false, e.message, 'webapi');
    }
    
    // 测试 2.8: keys() 迭代器
    console.log('\n=== 测试 2.8: keys() 迭代器 ===');
    try {
        const form = new FormData();
        form.append('a', '1');
        form.append('b', '2');
        form.append('c', '3');
        const keys = [];
        for (const key of form.keys()) {
            keys.push(key);
        }
        addTest('Web FormData keys()', keys.length === 3 && keys.indexOf('a') !== -1, null, 'webapi');
    } catch (e) {
        addTest('Web FormData keys()', false, e.message, 'webapi');
    }
    
    // 测试 2.9: values() 迭代器
    console.log('\n=== 测试 2.9: values() 迭代器 ===');
    try {
        const form = new FormData();
        form.append('x', 'val1');
        form.append('y', 'val2');
        const values = [];
        for (const value of form.values()) {
            values.push(value);
        }
        addTest('Web FormData values()', values.length === 2, null, 'webapi');
    } catch (e) {
        addTest('Web FormData values()', false, e.message, 'webapi');
    }
    
    // 测试 2.10: entries() 迭代器
    console.log('\n=== 测试 2.10: entries() 迭代器 ===');
    try {
        const form = new FormData();
        form.append('key1', 'value1');
        form.append('key2', 'value2');
        const entries = [];
        for (const [key, value] of form.entries()) {
            entries.push([key, value]);
        }
        addTest('Web FormData entries()', entries.length === 2 && entries[0][0] === 'key1', null, 'webapi');
    } catch (e) {
        addTest('Web FormData entries()', false, e.message, 'webapi');
    }
    
    // 测试 2.11: forEach() 方法
    console.log('\n=== 测试 2.11: forEach() 方法 ===');
    try {
        const form = new FormData();
        form.append('a', '1');
        form.append('b', '2');
        let count = 0;
        form.forEach(function(value, key) {
            count++;
        });
        addTest('Web FormData forEach', count === 2, null, 'webapi');
    } catch (e) {
        addTest('Web FormData forEach', false, e.message, 'webapi');
    }
    
    // 测试 2.12: Blob 和 File 附件
    console.log('\n=== 测试 2.12: Blob 和 File 附件 ===');
    try {
        const form = new FormData();
        const blob = new Blob(['test content'], { type: 'text/plain' });
        const file = new File(['file content'], 'test.txt', { type: 'text/plain' });
        
        form.append('blobfield', blob, 'blob.txt');
        form.append('filefield', file);
        
        const blobValue = form.get('blobfield');
        const fileValue = form.get('filefield');
        
        addTest('Web FormData Blob/File', blobValue !== null && fileValue !== null, null, 'webapi');
    } catch (e) {
        addTest('Web FormData Blob/File', false, e.message, 'webapi');
    }
    
} catch (e) {
    console.log('❌ Web API FormData 测试失败:', e.message);
}

// ============================================================
// Part 3: 错误处理测试
// ============================================================
console.log('\n【Part 3】错误处理测试');
console.log('------------------------------------------------------------');

// 测试 3.1: Node.js FormData - append 参数不足
console.log('\n=== 测试 3.1: Node.js FormData append 参数不足 ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    
    let errorCaught = false;
    try {
        form.append();
    } catch (e) {
        errorCaught = true;
    }
    addTest('Node.js FormData append 无参数抛错', errorCaught, null, 'errors');
} catch (e) {
    addTest('Node.js FormData append 无参数抛错', false, e.message, 'errors');
}

// 测试 3.2: Web FormData - append 参数不足
console.log('\n=== 测试 3.2: Web FormData append 参数不足 ===');
try {
    const form = new FormData();
    let errorCaught = false;
    try {
        form.append();
    } catch (e) {
        errorCaught = true;
    }
    addTest('Web FormData append 无参数抛错', errorCaught, null, 'errors');
} catch (e) {
    addTest('Web FormData append 无参数抛错', false, e.message, 'errors');
}

// 测试 3.3: Web FormData - get 不存在的键
console.log('\n=== 测试 3.3: Web FormData get 不存在的键 ===');
try {
    const form = new FormData();
    const value = form.get('nonexistent');
    addTest('Web FormData get 不存在键返回null', value === null, null, 'errors');
} catch (e) {
    addTest('Web FormData get 不存在键返回null', false, e.message, 'errors');
}

// 测试 3.4: Web FormData - getAll 不存在的键
console.log('\n=== 测试 3.4: Web FormData getAll 不存在的键 ===');
try {
    const form = new FormData();
    const values = form.getAll('nonexistent');
    addTest('Web FormData getAll 不存在键返回空数组', Array.isArray(values) && values.length === 0, null, 'errors');
} catch (e) {
    addTest('Web FormData getAll 不存在键返回空数组', false, e.message, 'errors');
}

// 测试 3.5: Web FormData - delete 不存在的键
console.log('\n=== 测试 3.5: Web FormData delete 不存在的键 ===');
try {
    const form = new FormData();
    form.delete('nonexistent');
    addTest('Web FormData delete 不存在键不抛错', true, null, 'errors');
} catch (e) {
    addTest('Web FormData delete 不存在键不抛错', false, e.message, 'errors');
}

// 测试 3.6: Node.js FormData - setBoundary 无参数
console.log('\n=== 测试 3.6: Node.js FormData setBoundary 无参数 ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    let errorCaught = false;
    try {
        form.setBoundary();
    } catch (e) {
        errorCaught = true;
    }
    addTest('Node.js FormData setBoundary 无参数抛错', errorCaught, null, 'errors');
} catch (e) {
    addTest('Node.js FormData setBoundary 无参数抛错', false, e.message, 'errors');
}

// 测试 3.7: Node.js FormData - getLength callback 类型错误
console.log('\n=== 测试 3.7: Node.js FormData getLength callback 类型错误 ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('test', 'value');
    let errorCaught = false;
    try {
        form.getLength('not-a-function');
    } catch (e) {
        errorCaught = true;
    }
    addTest('Node.js FormData getLength 非函数callback抛错', errorCaught, null, 'errors');
} catch (e) {
    addTest('Node.js FormData getLength 非函数callback抛错', false, e.message, 'errors');
}

// 测试 3.8: 空 Buffer append
console.log('\n=== 测试 3.8: 空 Buffer append ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    const Buffer = require('buffer').Buffer;
    const emptyBuffer = Buffer.from([]);
    form.append('empty', emptyBuffer, 'empty.bin');
    addTest('Node.js FormData 空Buffer append', true, null, 'errors');
} catch (e) {
    addTest('Node.js FormData 空Buffer append', false, e.message, 'errors');
}

// 测试 3.9: null 值处理
console.log('\n=== 测试 3.9: null 值处理 ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('nullfield', null);
    const buffer = form.getBuffer();
    addTest('Node.js FormData null值处理', buffer.length > 0, null, 'errors');
} catch (e) {
    addTest('Node.js FormData null值处理', false, e.message, 'errors');
}

// 测试 3.10: undefined 值处理
console.log('\n=== 测试 3.10: undefined 值处理 ===');
try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('undefinedfield', undefined);
    const buffer = form.getBuffer();
    addTest('Node.js FormData undefined值处理', buffer.length > 0, null, 'errors');
} catch (e) {
    addTest('Node.js FormData undefined值处理', false, e.message, 'errors');
}

// 测试 3.11: Web FormData - set 参数不足
console.log('\n=== 测试 3.11: Web FormData set 参数不足 ===');
try {
    const form = new FormData();
    let errorCaught = false;
    try {
        form.set();
    } catch (e) {
        errorCaught = true;
    }
    addTest('Web FormData set 无参数抛错', errorCaught, null, 'errors');
} catch (e) {
    addTest('Web FormData set 无参数抛错', false, e.message, 'errors');
}

// 测试 3.12: 大量数据append
console.log('\n=== 测试 3.12: 大量数据append ===');
try {
    const form = new FormData();
    for (let i = 0; i < 100; i++) {
        form.append('field' + i, 'value' + i);
    }
    let count = 0;
    for (const key of form.keys()) {
        count++;
    }
    addTest('Web FormData 大量数据append', count === 100, null, 'errors');
} catch (e) {
    addTest('Web FormData 大量数据append', false, e.message, 'errors');
}

// ============================================================
// 测试结果汇总
// ============================================================
console.log('\n============================================================');
console.log('测试结果汇总');
console.log('============================================================');
console.log('总计: ' + testResults.tests.length + ' 个测试');
console.log('通过: ' + testResults.passed + ' 个 ✅');
console.log('失败: ' + testResults.failed + ' 个 ❌');
console.log('');
console.log('分类统计:');
console.log('  Node.js FormData: ' + testResults.sections.nodejs.passed + '/' + 
            (testResults.sections.nodejs.passed + testResults.sections.nodejs.failed) + ' 通过');
console.log('  Web API FormData: ' + testResults.sections.webapi.passed + '/' + 
            (testResults.sections.webapi.passed + testResults.sections.webapi.failed) + ' 通过');
console.log('  错误处理测试: ' + testResults.sections.errors.passed + '/' + 
            (testResults.sections.errors.passed + testResults.sections.errors.failed) + ' 通过');

if (testResults.failed > 0) {
    console.log('\n失败的测试:');
    for (let i = 0; i < testResults.tests.length; i++) {
        if (!testResults.tests[i].success) {
            console.log('  - ' + testResults.tests[i].name + 
                       (testResults.tests[i].message ? ': ' + testResults.tests[i].message : ''));
        }
    }
}

console.log('\n============================================================');
console.log(testResults.failed === 0 ? '✅ 所有测试通过!' : '❌ 有 ' + testResults.failed + ' 个测试失败');
console.log('============================================================');

return {
    success: testResults.failed === 0,
    total: testResults.tests.length,
    passed: testResults.passed,
    failed: testResults.failed,
    sections: testResults.sections,
    message: testResults.failed === 0 ? '所有测试通过' : '有 ' + testResults.failed + ' 个测试失败'
};

