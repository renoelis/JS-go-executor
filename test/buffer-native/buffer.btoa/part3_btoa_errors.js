// buffer.btoa() - Error Cases Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 错误输入测试
test('超出Latin-1范围的字符（U+0100）', () => {
  try {
    btoa('Ā'); // U+0100
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('超出Latin-1范围的字符（中文）', () => {
  try {
    btoa('中文');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('超出Latin-1范围的字符（Emoji）', () => {
  try {
    btoa('😀');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('混合字符串（含超出范围字符）', () => {
  try {
    btoa('hello世界');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('Unicode BMP字符（U+1234）', () => {
  try {
    btoa('\u1234');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('边界字符U+00FF（应该通过）', () => {
  try {
    const result = btoa('\u00FF');
    return result === '/w==';
  } catch (e) {
    return false;
  }
});

test('边界字符U+0100（应该失败）', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('多字节UTF-8序列', () => {
  try {
    btoa('€'); // U+20AC
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('代理对（Surrogate pairs）', () => {
  try {
    btoa('\uD800\uDC00'); // U+10000
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('高代理项单独出现', () => {
  try {
    btoa('\uD800');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('低代理项单独出现', () => {
  try {
    btoa('\uDC00');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('无参数调用', () => {
  try {
    btoa();
    return false;
  } catch (e) {
    return e.message.includes('argument') || e.message.includes('required');
  }
});

test('参数过多（应该忽略额外参数）', () => {
  try {
    const result = btoa('test', 'extra', 'params');
    return result === 'dGVzdA==';
  } catch (e) {
    return false;
  }
});

test('包含NULL字节的有效输入', () => {
  try {
    const result = btoa('a\x00b');
    return result === 'YQBi';
  } catch (e) {
    return false;
  }
});

test('Latin-1全范围0x00-0xFF', () => {
  try {
    let allBytes = '';
    for (let i = 0; i <= 255; i++) {
      allBytes += String.fromCharCode(i);
    }
    const result = btoa(allBytes);
    return result.length > 0 && result.indexOf('=') >= -1;
  } catch (e) {
    return false;
  }
});

test('错误发生在字符串中间', () => {
  try {
    btoa('valid\u0100invalid');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误发生在字符串末尾', () => {
  try {
    btoa('valid\u0100');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
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
