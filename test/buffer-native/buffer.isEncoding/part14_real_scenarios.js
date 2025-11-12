// Buffer.isEncoding - part14: 实际应用场景测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 模拟实际应用场景

// 场景1：验证用户输入的编码参数
test('场景1-1：验证 API 参数中的编码', () => {
  function createBuffer(data, encoding) {
    if (!Buffer.isEncoding(encoding)) {
      throw new Error('Invalid encoding');
    }
    return Buffer.from(data, encoding);
  }

  try {
    createBuffer('hello', 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

test('场景1-2：拒绝无效的编码参数', () => {
  function createBuffer(data, encoding) {
    if (!Buffer.isEncoding(encoding)) {
      return null;
    }
    return Buffer.from(data, encoding);
  }

  return createBuffer('hello', 'invalid') === null;
});

// 场景2：配置对象验证
test('场景2-1：验证配置对象中的编码字段', () => {
  function validateConfig(config) {
    if (config.encoding && !Buffer.isEncoding(config.encoding)) {
      return false;
    }
    return true;
  }

  return validateConfig({encoding: 'utf8'}) === true;
});

test('场景2-2：配置对象包含无效编码应返回 false', () => {
  function validateConfig(config) {
    if (config.encoding && !Buffer.isEncoding(config.encoding)) {
      return false;
    }
    return true;
  }

  return validateConfig({encoding: 'invalid'}) === false;
});

test('场景2-3：配置对象无编码字段应通过验证', () => {
  function validateConfig(config) {
    if (config.encoding && !Buffer.isEncoding(config.encoding)) {
      return false;
    }
    return true;
  }

  return validateConfig({}) === true;
});

// 场景3：默认值回退
test('场景3-1：无效编码时使用默认值 utf8', () => {
  function getEncoding(encoding) {
    return Buffer.isEncoding(encoding) ? encoding : 'utf8';
  }

  return getEncoding('invalid') === 'utf8';
});

test('场景3-2：有效编码时使用传入值', () => {
  function getEncoding(encoding) {
    return Buffer.isEncoding(encoding) ? encoding : 'utf8';
  }

  return getEncoding('hex') === 'hex';
});

test('场景3-3：空值时使用默认值', () => {
  function getEncoding(encoding) {
    return Buffer.isEncoding(encoding) ? encoding : 'utf8';
  }

  return getEncoding(null) === 'utf8';
});

// 场景4：编码转换器工厂
test('场景4-1：创建编码转换器', () => {
  function createConverter(encoding) {
    if (!Buffer.isEncoding(encoding)) {
      throw new Error('Unsupported encoding');
    }
    return function(data) {
      return Buffer.from(data).toString(encoding);
    };
  }

  try {
    const converter = createConverter('hex');
    return typeof converter === 'function';
  } catch (e) {
    return false;
  }
});

test('场景4-2：无效编码应抛出异常', () => {
  function createConverter(encoding) {
    if (!Buffer.isEncoding(encoding)) {
      throw new Error('Unsupported encoding');
    }
    return function(data) {
      return Buffer.from(data).toString(encoding);
    };
  }

  try {
    createConverter('invalid');
    return false;
  } catch (e) {
    return e.message === 'Unsupported encoding';
  }
});

// 场景5：批量编码验证
test('场景5-1：过滤有效编码列表', () => {
  const encodings = ['utf8', 'invalid', 'hex', 'unknown', 'base64'];
  const valid = encodings.filter(e => Buffer.isEncoding(e));
  return valid.length === 3;
});

test('场景5-2：检查是否所有编码都有效', () => {
  const encodings = ['utf8', 'hex', 'base64'];
  return encodings.every(e => Buffer.isEncoding(e));
});

test('场景5-3：检查是否存在至少一个有效编码', () => {
  const encodings = ['invalid', 'utf8', 'unknown'];
  return encodings.some(e => Buffer.isEncoding(e));
});

// 场景6：条件编码选择
test('场景6-1：根据条件选择编码', () => {
  function selectEncoding(preferBinary) {
    const encoding = preferBinary ? 'binary' : 'utf8';
    return Buffer.isEncoding(encoding) ? encoding : 'utf8';
  }

  return selectEncoding(true) === 'binary';
});

test('场景6-2：多级回退编码选择', () => {
  function selectEncoding(preferred, fallback) {
    if (Buffer.isEncoding(preferred)) return preferred;
    if (Buffer.isEncoding(fallback)) return fallback;
    return 'utf8';
  }

  return selectEncoding('invalid', 'hex') === 'hex';
});

test('场景6-3：全部无效时使用最终默认值', () => {
  function selectEncoding(preferred, fallback) {
    if (Buffer.isEncoding(preferred)) return preferred;
    if (Buffer.isEncoding(fallback)) return fallback;
    return 'utf8';
  }

  return selectEncoding('invalid1', 'invalid2') === 'utf8';
});

// 场景7：编码兼容性检查
test('场景7-1：检查编码是否兼容', () => {
  function isCompatible(encoding) {
    return Buffer.isEncoding(encoding);
  }

  return isCompatible('utf8') === true;
});

test('场景7-2：大小写不敏感的兼容性检查', () => {
  function isCompatible(encoding) {
    return Buffer.isEncoding(encoding);
  }

  return isCompatible('UTF8') === true;
});

// 场景8：错误处理
test('场景8-1：捕获无效编码错误', () => {
  function safeCreateBuffer(data, encoding) {
    if (!Buffer.isEncoding(encoding)) {
      return {error: 'Invalid encoding', data: null};
    }
    return {error: null, data: Buffer.from(data, encoding)};
  }

  const result = safeCreateBuffer('hello', 'invalid');
  return result.error === 'Invalid encoding';
});

test('场景8-2：成功创建 Buffer', () => {
  function safeCreateBuffer(data, encoding) {
    if (!Buffer.isEncoding(encoding)) {
      return {error: 'Invalid encoding', data: null};
    }
    return {error: null, data: Buffer.from(data, encoding)};
  }

  const result = safeCreateBuffer('hello', 'utf8');
  return result.error === null && Buffer.isBuffer(result.data);
});

// 场景9：编码规范化
test('场景9-1：规范化编码名称（转小写）', () => {
  function normalizeEncoding(encoding) {
    return Buffer.isEncoding(encoding) ? encoding.toLowerCase() : null;
  }

  return normalizeEncoding('UTF8') === 'utf8';
});

test('场景9-2：无效编码返回 null', () => {
  function normalizeEncoding(encoding) {
    return Buffer.isEncoding(encoding) ? encoding.toLowerCase() : null;
  }

  return normalizeEncoding('invalid') === null;
});

// 场景10：支持的编码列表生成
test('场景10-1：从候选列表中筛选支持的编码', () => {
  const candidates = ['utf8', 'unknown', 'hex', 'invalid', 'base64', 'fake'];
  const supported = candidates.filter(e => Buffer.isEncoding(e));
  return supported.length === 3 && supported.includes('utf8');
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
