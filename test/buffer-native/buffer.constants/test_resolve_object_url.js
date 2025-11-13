// Buffer.resolveObjectURL 和 URL.createObjectURL 功能测试
const buffer = require('buffer');
const { Blob } = buffer;

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 基本功能测试 ===

// 1. buffer.resolveObjectURL 函数存在
test('buffer.resolveObjectURL 函数存在', () => {
  return typeof buffer.resolveObjectURL === 'function';
});

// 2. URL.createObjectURL 函数存在
test('URL.createObjectURL 函数存在', () => {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
});

// 3. URL.revokeObjectURL 函数存在
test('URL.revokeObjectURL 函数存在', () => {
  return typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function';
});

// === 基本功能验证 ===

// 4. 创建和解析 Blob URL
test('创建和解析 Blob URL 基本功能', () => {
  try {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // 验证URL格式
    if (!url.startsWith('blob:nodedata:')) {
      return false;
    }
    
    // 解析Blob对象
    const resolved = buffer.resolveObjectURL(url);
    
    // 验证解析结果
    return resolved && resolved.size === blob.size && resolved.type === blob.type;
  } catch (e) {
    return false;
  }
});

// 5. 无效URL返回undefined
test('无效URL返回undefined', () => {
  const result = buffer.resolveObjectURL('invalid-url');
  return result === undefined;
});

// 6. 空字符串返回undefined
test('空字符串返回undefined', () => {
  const result = buffer.resolveObjectURL('');
  return result === undefined;
});

// 7. null参数返回undefined
test('null参数返回undefined', () => {
  const result = buffer.resolveObjectURL(null);
  return result === undefined;
});

// 8. undefined参数返回undefined
test('undefined参数返回undefined', () => {
  const result = buffer.resolveObjectURL(undefined);
  return result === undefined;
});

// 9. 数字参数转为字符串处理
test('数字参数转为字符串处理', () => {
  const result = buffer.resolveObjectURL(123);
  return result === undefined;
});

// === 高级功能测试 ===

// 10. 撤销URL后无法解析
test('撤销URL后无法解析', () => {
  try {
    const blob = new Blob(['test data'], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    // 先验证可以解析
    const resolved1 = buffer.resolveObjectURL(url);
    if (!resolved1) return false;
    
    // 撤销URL
    URL.revokeObjectURL(url);
    
    // 再次尝试解析应该返回undefined
    const resolved2 = buffer.resolveObjectURL(url);
    return resolved2 === undefined;
  } catch (e) {
    return false;
  }
});

// 11. 多个Blob URL独立管理
test('多个Blob URL独立管理', () => {
  try {
    const blob1 = new Blob(['data1'], { type: 'text/plain' });
    const blob2 = new Blob(['data2'], { type: 'application/json' });
    
    const url1 = URL.createObjectURL(blob1);
    const url2 = URL.createObjectURL(blob2);
    
    // 验证URL不同
    if (url1 === url2) return false;
    
    // 验证可以独立解析
    const resolved1 = buffer.resolveObjectURL(url1);
    const resolved2 = buffer.resolveObjectURL(url2);
    
    return resolved1 && resolved2 && 
           resolved1.size === blob1.size && 
           resolved2.size === blob2.size &&
           resolved1.type === blob1.type &&
           resolved2.type === blob2.type;
  } catch (e) {
    return false;
  }
});

// 12. 大型Blob处理
test('大型Blob处理', () => {
  try {
    // 创建1KB的数据
    const data = 'x'.repeat(1024);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const resolved = buffer.resolveObjectURL(url);
    
    return resolved && resolved.size === 1024;
  } catch (e) {
    return false;
  }
});

// === 边界情况测试 ===

// 13. 非blob:nodedata:格式的URL
test('非blob:nodedata:格式的URL返回undefined', () => {
  const testUrls = [
    'blob:http://example.com/123',
    'data:text/plain;base64,aGVsbG8=',
    'http://example.com',
    'blob:',
    'blob:nodedata',
    'blob:nodedata:'
  ];
  
  return testUrls.every(url => buffer.resolveObjectURL(url) === undefined);
});

// 14. 函数属性验证
test('resolveObjectURL函数属性正确', () => {
  return buffer.resolveObjectURL.length === 1 && 
         buffer.resolveObjectURL.name === 'resolveObjectURL';
});

// 15. createObjectURL函数属性正确
test('createObjectURL函数属性正确', () => {
  return URL.createObjectURL.length === 1 && 
         URL.createObjectURL.name === 'createObjectURL';
});

// === 与Blob API集成测试 ===

// 16. 不同类型的Blob
test('不同类型的Blob处理', () => {
  try {
    const blobs = [
      new Blob(['plain text'], { type: 'text/plain' }),
      new Blob(['{"key":"value"}'], { type: 'application/json' }),
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'application/octet-stream' }),
      new Blob([], { type: '' }) // 空Blob
    ];
    
    for (const blob of blobs) {
      const url = URL.createObjectURL(blob);
      const resolved = buffer.resolveObjectURL(url);
      
      if (!resolved || resolved.size !== blob.size || resolved.type !== blob.type) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
});

// 17. Blob with multiple parts
test('多部分Blob处理', () => {
  try {
    const blob = new Blob(['hello', ' ', 'world'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const resolved = buffer.resolveObjectURL(url);
    
    return resolved && resolved.size === 11 && resolved.type === 'text/plain';
  } catch (e) {
    return false;
  }
});

// === 错误处理测试 ===

// 18. 无参数调用不抛出错误
test('无参数调用不抛出错误', () => {
  try {
    const result = buffer.resolveObjectURL();
    return result === undefined;
  } catch (e) {
    return false;
  }
});

// 19. createObjectURL无参数抛出错误
test('createObjectURL无参数抛出错误', () => {
  try {
    URL.createObjectURL();
    return false;
  } catch (e) {
    return e.message.includes('argument');
  }
});

// 20. createObjectURL非对象参数抛出错误
test('createObjectURL非对象参数抛出错误', () => {
  try {
    URL.createObjectURL('not an object');
    return false;
  } catch (e) {
    return e.message.includes('object');
  }
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
