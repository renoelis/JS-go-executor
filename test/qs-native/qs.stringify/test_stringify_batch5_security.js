// qs.stringify() 批次5: 安全性测试 (原型污染防护、特殊键处理)
// 版本: qs v6.14.0
// 用例数: 约 30 个

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = got === expect;
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function tSafe(name, fn, checkFn) {
      total++;
      try {
        fn();
        const ok = checkFn();
        detail.push({ case: name, expect: 'Safe', got: ok ? 'Safe' : 'Unsafe', pass: ok });
        console.log(`${ok ? '✅' : '❌'} ${name}`);
        if (ok) pass++;
        return ok;
      } catch (err) {
        detail.push({ case: name, expect: 'Safe', got: err.message, pass: false });
        console.log(`❌ ${name} - Error: ${err.message}`);
        return false;
      }
    }

    console.log('📦 批次5: 安全性测试\n');

    // __proto__ 键处理（qs 默认过滤 __proto__ 以防止原型污染）
    console.log('__proto__ 键处理测试:');
    t('stringify __proto__ key (filtered for security)', 
      qs.stringify({ '__proto__': 'polluted' }), 
      '');
    t('stringify nested __proto__ (filtered)', 
      qs.stringify({ obj: { '__proto__': 'value' } }), 
      '');
    t('stringify __proto__ in array (filtered)', 
      qs.stringify({ '__proto__': ['a', 'b'] }), 
      '');
    t('stringify __proto__ with allowDots (filtered)', 
      qs.stringify({ '__proto__': { 'x': 'y' } }, { allowDots: true }), 
      '');

    // constructor 键处理
    console.log('\nconstructor 键处理测试:');
    t('stringify constructor key', 
      qs.stringify({ 'constructor': 'value' }), 
      'constructor=value');
    t('stringify nested constructor', 
      qs.stringify({ obj: { 'constructor': 'value' } }), 
      'obj%5Bconstructor%5D=value');
    t('stringify constructor.prototype', 
      qs.stringify({ 'constructor': { 'prototype': 'value' } }), 
      'constructor%5Bprototype%5D=value');

    // prototype 键处理
    console.log('\nprototype 键处理测试:');
    t('stringify prototype key', 
      qs.stringify({ 'prototype': 'value' }), 
      'prototype=value');
    t('stringify nested prototype', 
      qs.stringify({ obj: { 'prototype': 'value' } }), 
      'obj%5Bprototype%5D=value');

    // 安全性验证：确保不会污染原型
    console.log('\n原型污染防护验证:');
    tSafe('stringify does not pollute Object.prototype', function() {
      const before = Object.prototype.polluted;
      qs.stringify({ '__proto__': { 'polluted': 'yes' } });
      return before;
    }, function() {
      return Object.prototype.polluted === undefined;
    });

    tSafe('stringify with allowDots does not pollute', function() {
      const before = Object.prototype.polluted2;
      qs.stringify({ '__proto__': { 'polluted2': 'yes' } }, { allowDots: true });
      return before;
    }, function() {
      return Object.prototype.polluted2 === undefined;
    });

    tSafe('stringify constructor does not affect Object', function() {
      const origConstructor = Object.constructor;
      qs.stringify({ 'constructor': 'modified' });
      return origConstructor;
    }, function() {
      return Object.constructor === Object.constructor;
    });

    // 特殊方法名作为键
    console.log('\n特殊方法名测试:');
    t('stringify toString as key', 
      qs.stringify({ 'toString': 'value' }), 
      'toString=value');
    t('stringify valueOf as key', 
      qs.stringify({ 'valueOf': 'value' }), 
      'valueOf=value');
    t('stringify hasOwnProperty as key', 
      qs.stringify({ 'hasOwnProperty': 'value' }), 
      'hasOwnProperty=value');
    t('stringify __defineGetter__ as key', 
      qs.stringify({ '__defineGetter__': 'value' }), 
      '__defineGetter__=value');
    t('stringify __defineSetter__ as key', 
      qs.stringify({ '__defineSetter__': 'value' }), 
      '__defineSetter__=value');
    t('stringify __lookupGetter__ as key', 
      qs.stringify({ '__lookupGetter__': 'value' }), 
      '__lookupGetter__=value');
    t('stringify __lookupSetter__ as key', 
      qs.stringify({ '__lookupSetter__': 'value' }), 
      '__lookupSetter__=value');

    // SQL 注入风险字符
    console.log('\nSQL 注入风险字符测试:');
    t('stringify with single quote', 
      qs.stringify({ sql: "'; DROP TABLE users; --" }), 
      'sql=%27%3B%20DROP%20TABLE%20users%3B%20--');
    t('stringify with SQL keywords', 
      qs.stringify({ query: 'SELECT * FROM users WHERE id=1 OR 1=1' }), 
      'query=SELECT%20%2A%20FROM%20users%20WHERE%20id%3D1%20OR%201%3D1');

    // XSS 风险字符
    console.log('\nXSS 风险字符测试:');
    t('stringify with script tag', 
      qs.stringify({ xss: '<script>alert("xss")</script>' }), 
      'xss=%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E');
    t('stringify with event handler', 
      qs.stringify({ xss: '<img src=x onerror=alert(1)>' }), 
      'xss=%3Cimg%20src%3Dx%20onerror%3Dalert%281%29%3E');
    t('stringify with javascript protocol', 
      qs.stringify({ url: 'javascript:alert(1)' }), 
      'url=javascript%3Aalert%281%29');

    // 命令注入风险字符
    console.log('\n命令注入风险字符测试:');
    t('stringify with command separator', 
      qs.stringify({ cmd: 'ls -la; rm -rf /' }), 
      'cmd=ls%20-la%3B%20rm%20-rf%20%2F');
    t('stringify with pipe', 
      qs.stringify({ cmd: 'cat file | grep secret' }), 
      'cmd=cat%20file%20%7C%20grep%20secret');
    t('stringify with backtick', 
      qs.stringify({ cmd: '`whoami`' }), 
      'cmd=%60whoami%60');

    // 路径遍历风险
    console.log('\n路径遍历风险测试:');
    t('stringify with path traversal', 
      qs.stringify({ file: '../../etc/passwd' }), 
      'file=..%2F..%2Fetc%2Fpasswd');
    t('stringify with Windows path traversal', 
      qs.stringify({ file: '..\\..\\windows\\system32' }), 
      'file=..%5C..%5Cwindows%5Csystem32');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次5测试汇总:', JSON.stringify(summary, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      }
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();

