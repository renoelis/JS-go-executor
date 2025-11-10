// qs.stringify() 非常规类型支持验证测试
// 目标：确认 goja 环境对 Symbol/BigInt/Buffer 的具体支持情况
// 版本: qs v6.14.0

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, testFn) {
      total++;
      try {
        const result = testFn();
        detail.push({ 
          case: name, 
          result: result,
          type: typeof result,
          pass: true 
        });
        console.log(`✅ ${name}: ${JSON.stringify(result)}`);
        pass++;
        return true;
      } catch (err) {
        detail.push({ 
          case: name, 
          error: err.message,
          stack: err.stack,
          pass: false 
        });
        console.log(`❌ ${name}: ${err.message}`);
        return false;
      }
    }

    console.log('📦 非常规类型支持验证测试\n');

    // ========== Symbol 测试 ==========
    console.log('━━━ Symbol 测试 ━━━');
    
    t('Symbol 类型是否存在', () => {
      return typeof Symbol;
    });

    if (typeof Symbol !== 'undefined') {
      t('创建 Symbol', () => {
        const sym = Symbol('test');
        return sym.toString();
      });

      t('stringify Symbol value', () => {
        const obj = { a: 'b', sym: Symbol('test'), c: 'd' };
        return qs.stringify(obj);
      });

      t('stringify Symbol key', () => {
        const sym = Symbol('key');
        const obj = { a: 'b' };
        obj[sym] = 'value';
        return qs.stringify(obj);
      });

      t('stringify multiple Symbols', () => {
        const obj = { 
          a: Symbol('s1'), 
          b: 'normal', 
          c: Symbol('s2') 
        };
        return qs.stringify(obj);
      });
    } else {
      console.log('ℹ️  Symbol 类型不存在');
      detail.push({ case: 'Symbol not available', result: 'N/A', pass: true });
      total++;
      pass++;
    }

    // ========== BigInt 测试 ==========
    console.log('\n━━━ BigInt 测试 ━━━');
    
    t('BigInt 类型是否存在', () => {
      return typeof BigInt;
    });

    if (typeof BigInt !== 'undefined') {
      t('创建 BigInt', () => {
        const big = BigInt(123);
        return big.toString();
      });

      t('stringify BigInt value', () => {
        const obj = { a: BigInt(123), b: 'normal' };
        return qs.stringify(obj);
      });

      t('stringify large BigInt', () => {
        const obj = { value: BigInt('9007199254740991') };
        return qs.stringify(obj);
      });

      t('stringify negative BigInt', () => {
        const obj = { value: BigInt(-456) };
        return qs.stringify(obj);
      });

      t('stringify mixed with BigInt', () => {
        const obj = { 
          a: 'string', 
          b: 123, 
          c: BigInt(789),
          d: true 
        };
        return qs.stringify(obj);
      });
    } else {
      console.log('ℹ️  BigInt 类型不存在');
      detail.push({ case: 'BigInt not available', result: 'N/A', pass: true });
      total++;
      pass++;
    }

    // ========== Buffer 测试 ==========
    console.log('\n━━━ Buffer 测试 ━━━');
    
    t('Buffer 类型是否存在', () => {
      return typeof Buffer;
    });

    if (typeof Buffer !== 'undefined') {
      t('创建 Buffer', () => {
        const buf = Buffer.from('hello');
        return buf.toString();
      });

      t('stringify Buffer value', () => {
        const buf = Buffer.from('hello');
        const obj = { a: 'normal', buf: buf };
        return qs.stringify(obj);
      });

      t('stringify Buffer with encoding', () => {
        const buf = Buffer.from('world', 'utf8');
        const obj = { data: buf };
        return qs.stringify(obj);
      });

      t('stringify empty Buffer', () => {
        const buf = Buffer.from('');
        const obj = { empty: buf };
        return qs.stringify(obj);
      });

      t('stringify Buffer in array', () => {
        const buf1 = Buffer.from('a');
        const buf2 = Buffer.from('b');
        const obj = { buffers: [buf1, buf2] };
        return qs.stringify(obj);
      });

      t('stringify Buffer in nested object', () => {
        const buf = Buffer.from('nested');
        const obj = { outer: { inner: buf } };
        return qs.stringify(obj);
      });
    } else {
      console.log('ℹ️  Buffer 类型不存在');
      detail.push({ case: 'Buffer not available', result: 'N/A', pass: true });
      total++;
      pass++;
    }

    // ========== RegExp 测试（对照组）==========
    console.log('\n━━━ RegExp 测试（对照组）━━━');
    
    t('stringify RegExp value', () => {
      const obj = { a: 'b', regex: /test/gi, c: 'd' };
      return qs.stringify(obj);
    });

    // ========== Function 测试（对照组）==========
    console.log('\n━━━ Function 测试（对照组）━━━');
    
    t('stringify Function value', () => {
      const obj = { a: 'b', fn: function() { return 'test'; }, c: 'd' };
      return qs.stringify(obj);
    });

    // ========== 环境信息 ==========
    console.log('\n━━━ 环境信息 ━━━');
    const envInfo = {
      hasSymbol: typeof Symbol !== 'undefined',
      hasBigInt: typeof BigInt !== 'undefined',
      hasBuffer: typeof Buffer !== 'undefined',
      hasRegExp: typeof RegExp !== 'undefined',
      hasFunction: typeof Function !== 'undefined'
    };
    
    console.log('环境支持:', JSON.stringify(envInfo, null, 2));
    detail.push({ case: 'Environment Info', result: envInfo, pass: true });

    // 汇总
    const summary = { 
      total, 
      pass, 
      fail: total - pass,
      environment: envInfo
    };
    
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试汇总:', JSON.stringify(summary, null, 2));
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




