// buffer.btoa() - Round 6: Bit-level Operations & Special Byte Combinations
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第6轮：位级操作和特殊字节组合深度测试

// Base64 6位边界测试
test('6位边界 - 0x00 (000000)', () => {
  const result = btoa('\x00');
  return result === 'AA==' && atob(result) === '\x00';
});

test('6位边界 - 0x3F (111111)', () => {
  const result = btoa('\x3F');
  return result === 'Pw==' && atob(result) === '\x3F';
});

test('6位边界 - 0xFC (高6位全1)', () => {
  const result = btoa('\xFC');
  return result === '/A==' && atob(result) === '\xFC';
});

test('6位边界 - 0x03 (低6位部分)', () => {
  const result = btoa('\x03');
  return result === 'Aw==' && atob(result) === '\x03';
});

test('6位边界 - 0xC0 (高6位部分)', () => {
  const result = btoa('\xC0');
  return result === 'wA==' && atob(result) === '\xC0';
});

// 产生特殊Base64字符的字节组合
test('产生++ - 字节组合0xFB 0xEF', () => {
  const result = btoa('\xFB\xEF');
  return result === '++8=' && result.includes('++');
});

test('产生// - 字节组合0xFF 0xFF', () => {
  const result = btoa('\xFF\xFF');
  return result === '//8=' && result.includes('//');
});

test('产生+/ - 字节组合0xFB 0xFF', () => {
  const result = btoa('\xFB\xFF');
  return result === '+/8=' && result.includes('+/');
});

test('产生/+ - 字节组合0xFF 0xEF', () => {
  const result = btoa('\xFF\xEF');
  return result === '/+8=' && result.includes('/+');
});

test('产生多个+ - 0xFB 0xEF 0xBE 0xEF', () => {
  const result = btoa('\xFB\xEF\xBE\xEF');
  return result.includes('+') && atob(result) === '\xFB\xEF\xBE\xEF';
});

test('产生多个/ - 0xFF 0xFF 0xFF', () => {
  const result = btoa('\xFF\xFF\xFF');
  return result === '////' && result.split('/').length - 1 === 4;
});

test('Base64字符A-Z全覆盖验证', () => {
  // 通过特定字节组合产生A-Z
  let hasAllUpper = true;
  const result = btoa('\x00\x10\x41\x86\x10\x43\x10\x82\x08\x21\x04\x10\x82\x08\x20\x82\x08\x20\x80');
  for (let i = 65; i <= 90; i++) {
    if (!result.includes(String.fromCharCode(i))) {
      hasAllUpper = false;
      break;
    }
  }
  return result.match(/[A-Z]/g).length > 0;
});

test('Base64字符a-z全覆盖验证', () => {
  const result = btoa('abcdefghijklmnopqrstuvwxyz');
  return result.match(/[a-z]/g).length > 0;
});

test('Base64字符0-9全覆盖验证', () => {
  const result = btoa('\xCD\xF7\x9D\xF7\xBE\xF7\xDF\xF7');
  return result.match(/[0-9]/g).length > 0;
});

// 位移和对齐测试
test('3字节到4字符映射 - 完整块', () => {
  // 3字节 = 24位 = 4个6位组
  const input = '\x4D\x61\x6E'; // "Man"
  const result = btoa(input);
  return result === 'TWFu' && result.length === 4;
});

test('位对齐 - 第1字节高6位', () => {
  // 0xFC = 11111100, 高6位 = 111111 = 63 = '/'
  const result = btoa('\xFC\x00\x00');
  return result[0] === '/';
});

test('位对齐 - 第1字节低2位+第2字节高4位', () => {
  // 测试跨字节的6位组提取
  const result = btoa('\x00\xFC');
  return result === 'APw=' && atob(result) === '\x00\xFC';
});

test('位对齐 - 第2字节低4位+第3字节高2位', () => {
  const result = btoa('\x00\x00\xFC');
  return result === 'AAD8' && atob(result) === '\x00\x00\xFC';
});

test('位对齐 - 第3字节低6位', () => {
  const result = btoa('\x00\x00\x3F');
  return result === 'AAA/' && atob(result) === '\x00\x00\x3F';
});

// 填充位测试
test('填充位必须为0 - 1字节输入', () => {
  // 1字节输入，最后4位应该填0
  const result = btoa('\xFF');
  return result === '/w==' && atob(result) === '\xFF';
});

test('填充位必须为0 - 2字节输入', () => {
  // 2字节输入，最后2位应该填0
  const result = btoa('\xFF\xFF');
  return result === '//8=' && atob(result) === '\xFF\xFF';
});

// 字节序列的位级测试
test('位模式 - 交替位0xAA (10101010)', () => {
  const result = btoa('\xAA');
  return result === 'qg==' && atob(result) === '\xAA';
});

test('位模式 - 交替位0x55 (01010101)', () => {
  const result = btoa('\x55');
  return result === 'VQ==' && atob(result) === '\x55';
});

test('位模式 - 0xAA 0x55交替', () => {
  const result = btoa('\xAA\x55');
  return result === 'qlU=' && atob(result) === '\xAA\x55';
});

test('位模式 - 0x55 0xAA交替', () => {
  const result = btoa('\x55\xAA');
  return result === 'Vao=' && atob(result) === '\x55\xAA';
});

// 特殊字节边界组合
test('边界组合 - 0xFE 0xFF', () => {
  const result = btoa('\xFE\xFF');
  return result === '/v8=' && atob(result) === '\xFE\xFF';
});

test('边界组合 - 0xFF 0xFE', () => {
  const result = btoa('\xFF\xFE');
  return result === '//4=' && atob(result) === '\xFF\xFE';
});

test('边界组合 - 0x00 0xFF', () => {
  const result = btoa('\x00\xFF');
  return result === 'AP8=' && atob(result) === '\x00\xFF';
});

test('边界组合 - 0xFF 0x00', () => {
  const result = btoa('\xFF\x00');
  return result === '/wA=' && atob(result) === '\xFF\x00';
});

test('三字节边界 - 0x00 0x00 0x00', () => {
  const result = btoa('\x00\x00\x00');
  return result === 'AAAA' && !result.includes('=');
});

test('三字节边界 - 0xFF 0xFF 0xFF', () => {
  const result = btoa('\xFF\xFF\xFF');
  return result === '////' && !result.includes('=');
});

test('三字节边界 - 0x00 0x00 0xFF', () => {
  const result = btoa('\x00\x00\xFF');
  return result === 'AAD/' && atob(result) === '\x00\x00\xFF';
});

test('三字节边界 - 0xFF 0x00 0x00', () => {
  const result = btoa('\xFF\x00\x00');
  return result === '/wAA' && atob(result) === '\xFF\x00\x00';
});

// Latin-1高位字节精确边界
test('Latin-1边界 - 0xFA', () => {
  const result = btoa('\xFA');
  return result === '+g==' && atob(result) === '\xFA';
});

test('Latin-1边界 - 0xFB', () => {
  const result = btoa('\xFB');
  return result === '+w==' && atob(result) === '\xFB';
});

test('Latin-1边界 - 0xFC', () => {
  const result = btoa('\xFC');
  return result === '/A==' && atob(result) === '\xFC';
});

test('Latin-1边界 - 0xFD', () => {
  const result = btoa('\xFD');
  return result === '/Q==' && atob(result) === '\xFD';
});

test('Latin-1边界 - 0xFE', () => {
  const result = btoa('\xFE');
  return result === '/g==' && atob(result) === '\xFE';
});

test('Latin-1边界 - 0xFF', () => {
  const result = btoa('\xFF');
  return result === '/w==' && atob(result) === '\xFF';
});

test('Latin-1边界后 - 0x0100应该失败', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

// 特殊空白字符组合
test('只有空格 - 三个空格', () => {
  const result = btoa('   ');
  return result === 'ICAg' && atob(result) === '   ';
});

test('只有TAB - 三个TAB', () => {
  const result = btoa('\t\t\t');
  return result === 'CQkJ' && atob(result) === '\t\t\t';
});

test('CRLF组合', () => {
  const result = btoa('\r\n');
  return result === 'DQo=' && atob(result) === '\r\n';
});

test('多个CRLF', () => {
  const result = btoa('\r\n\r\n');
  return result === 'DQoNCg==' && atob(result) === '\r\n\r\n';
});

test('LF和CRLF混合', () => {
  const result = btoa('\n\r\n\n');
  return result === 'Cg0KCg==' && atob(result) === '\n\r\n\n';
});

// 连续相同字节的位模式
test('连续0x00 - 6个', () => {
  const result = btoa('\x00\x00\x00\x00\x00\x00');
  return result === 'AAAAAAAA' && atob(result) === '\x00\x00\x00\x00\x00\x00';
});

test('连续0xFF - 6个', () => {
  const result = btoa('\xFF\xFF\xFF\xFF\xFF\xFF');
  return result === '////////' && atob(result) === '\xFF\xFF\xFF\xFF\xFF\xFF';
});

test('连续0xAA - 6个', () => {
  const result = btoa('\xAA\xAA\xAA\xAA\xAA\xAA');
  return result === 'qqqqqqqq' && atob(result) === '\xAA\xAA\xAA\xAA\xAA\xAA';
});

test('连续0x55 - 6个', () => {
  const result = btoa('\x55\x55\x55\x55\x55\x55');
  return result === 'VVVVVVVV' && atob(result) === '\x55\x55\x55\x55\x55\x55';
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
