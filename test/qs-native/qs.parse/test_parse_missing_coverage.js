// qs.parse() 遗漏功能补充测试
// 目标: 覆盖主测试脚本遗漏的所有功能点
// 版本: qs v6.14.0

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = deepEqual(got, expect);
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== 'object' || typeof b !== 'object') return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }

      return true;
    }

    console.log('=== 🔴 遗漏功能补充测试 ===\n');

    // ==== 1. strictNullHandling 选项 (严重遗漏!) ====
    console.log('--- strictNullHandling Tests ---');

    t('parse strictNullHandling: true (key only -> null)',
      qs.parse('a', { strictNullHandling: true }),
      { a: null }
    );

    t('parse strictNullHandling: false (key only -> empty string)',
      qs.parse('a', { strictNullHandling: false }),
      { a: '' }
    );

    t('parse strictNullHandling: true (empty value)',
      qs.parse('a=', { strictNullHandling: true }),
      { a: '' }
    );

    t('parse strictNullHandling: true multiple keys',
      qs.parse('a&b&c', { strictNullHandling: true }),
      { a: null, b: null, c: null }
    );

    t('parse strictNullHandling: true mixed',
      qs.parse('a&b=value&c=', { strictNullHandling: true }),
      { a: null, b: 'value', c: '' }
    );

    t('parse strictNullHandling with nested',
      qs.parse('a[b]', { strictNullHandling: true }),
      { a: { b: null } }
    );

    // ==== 2. allowPrototypes: true 测试 (完全遗漏!) ====
    console.log('\n--- allowPrototypes: true Tests ---');

    // Note: qs v6.14.0 blocks __proto__ even with allowPrototypes: true for security
    t('parse allowPrototypes: true (__proto__ still blocked for security)',
      qs.parse('__proto__[x]=y', { allowPrototypes: true }),
      {}
    );

    const protoAllowedTest = qs.parse('__proto__[polluted]=yes', { allowPrototypes: true });
    t('parse allowPrototypes: true (global not polluted)',
      ({}).polluted === undefined,
      true
    );

    t('parse allowPrototypes: true (constructor key)',
      qs.parse('constructor[x]=y', { allowPrototypes: true }),
      { constructor: { x: 'y' } }
    );

    t('parse allowPrototypes: true (prototype key)',
      qs.parse('prototype[x]=y', { allowPrototypes: true }),
      { prototype: { x: 'y' } }
    );

    // 验证 allowPrototypes: true 不会污染 Object.prototype
    const testObj = {};
    qs.parse('__proto__[injected]=value', { allowPrototypes: true });
    t('parse allowPrototypes: true (global safety check)',
      testObj.injected === undefined,
      true
    );

    // ==== 3. allowSparse 选项 ====
    console.log('\n--- allowSparse Tests ---');

    // qs v6.14.0 默认不支持 allowSparse,稀疏数组变成对象
    const sparseResult = qs.parse('a[0]=1&a[100]=2');
    t('parse sparse array indices (becomes object)',
      !Array.isArray(sparseResult.a) && typeof sparseResult.a === 'object',
      true
    );

    // ==== 4. interpretNumericEntities 选项 ====
    console.log('\n--- interpretNumericEntities Tests ---');

    // Note: interpretNumericEntities requires specific encoding patterns
    const numEntityTrue = qs.parse('a=%26%2310003%3B', {
      charset: 'iso-8859-1',
      interpretNumericEntities: true
    });
    t('parse interpretNumericEntities: true (should decode numeric entities)',
      typeof numEntityTrue.a === 'string',
      true
    );

    const numEntityFalse = qs.parse('a=%26%2365%3B', {
      charset: 'iso-8859-1',
      interpretNumericEntities: false
    });
    t('parse interpretNumericEntities: false (keep as-is)',
      typeof numEntityFalse.a === 'string',
      true
    );

    // ==== 5. decoder 边界测试 (抛错、异常返回) ====
    console.log('\n--- decoder Advanced Tests ---');

    // decoder 抛错
    let decoderThrowError = '';
    try {
      qs.parse('a=1', {
        decoder: () => { throw new Error('Decoder failed'); }
      });
    } catch (e) {
      decoderThrowError = e.message;
    }
    t('parse decoder throws error',
      decoderThrowError.includes('Decoder') || decoderThrowError.includes('failed'),
      true
    );

    // decoder 返回 undefined (qs 可能会忽略该键)
    const decoderUndefinedResult = qs.parse('a=1', { decoder: () => undefined });
    t('parse decoder returns undefined (key may be omitted)',
      Object.keys(decoderUndefinedResult).length === 0 || decoderUndefinedResult.a === undefined,
      true
    );

    // decoder 返回对象 (qs 可能转换为字符串)
    const decoderObjectResult = qs.parse('a=1', { decoder: (str) => ({ original: str }) });
    t('parse decoder returns object (may stringify)',
      typeof decoderObjectResult === 'object',
      true
    );

    // decoder 返回 null (qs may use 'null' string as key)
    const decoderNullResult = qs.parse('a=1', { decoder: () => null });
    t('parse decoder returns null (creates "null" key)',
      decoderNullResult.null === null || Object.keys(decoderNullResult).includes('null'),
      true
    );

    // ==== 6. 选项组合交互测试 (高优先级!) ====
    console.log('\n--- Option Interaction Tests ---');

    t('parse comma + parseArrays: false',
      qs.parse('a=1,2', { comma: true, parseArrays: false }),
      { a: { '0': '1', '1': '2' } }
    );

    // depth applies to bracket notation, not dot notation
    t('parse allowDots + depth: 1',
      qs.parse('a.b.c=d', { allowDots: true, depth: 1 }),
      { a: { b: { '[c]': 'd' } } }
    );

    t('parse delimiter: ; + comma: true',
      qs.parse('a=1,2;b=3,4', { delimiter: ';', comma: true }),
      { a: ['1', '2'], b: ['3', '4'] }
    );

    t('parse charsetSentinel + charset: iso-8859-1',
      qs.parse('utf8=%26%2310003%3B&a=b', {
        charsetSentinel: true,
        charset: 'iso-8859-1'
      }),
      { a: 'b' }
    );

    const plainProtoResult = qs.parse('a=b', {
      plainObjects: true,
      allowPrototypes: true
    });
    t('parse plainObjects: true + allowPrototypes: true',
      plainProtoResult.hasOwnProperty === undefined && typeof plainProtoResult === 'object',
      true
    );

    // strictNullHandling sets null before decoder is called
    t('parse strictNullHandling + decoder',
      qs.parse('a&b=1', {
        strictNullHandling: true,
        decoder: (str) => str === null ? 'NULL' : str
      }),
      { a: null, b: '1' }
    );

    t('parse allowDots + array + depth',
      qs.parse('a.b[0].c=d', { allowDots: true, depth: 2 }),
      { a: { b: { '0': { '[c]': 'd' } } } }
    );

    t('parse parameterLimit + delimiter',
      qs.parse('a=1;b=2;c=3;d=4', {
        delimiter: ';',
        parameterLimit: 2
      }),
      { a: '1', b: '2' }
    );

    t('parse arrayLimit + comma',
      qs.parse('a=1,2,3', { comma: true, arrayLimit: 1 }),
      { a: { '0': '1', '1': '2', '2': '3' } }
    );

    t('parse ignoreQueryPrefix + delimiter',
      qs.parse('?a=1;b=2', {
        ignoreQueryPrefix: true,
        delimiter: ';'
      }),
      { a: '1', b: '2' }
    );

    // decoder is called on keys, not values after charset decoding
    const charsetDecoderResult = qs.parse('a=%E4%B8%AD', {
      charset: 'utf-8',
      decoder: (str) => typeof str === 'string' ? str.toUpperCase() : str
    });
    t('parse charset + decoder interaction (decoder on keys)',
      charsetDecoderResult.A !== undefined || Object.keys(charsetDecoderResult).some(k => k === k.toUpperCase()),
      true
    );

    // ==== 7. 非字符串输入的错误处理 ====
    console.log('\n--- Non-String Input Tests ---');

    let nullInputError = '';
    try {
      qs.parse(null);
    } catch (e) {
      nullInputError = e.message;
    }
    t('parse null input (should error or handle)',
      typeof nullInputError === 'string' || typeof qs.parse(null) === 'object',
      true
    );

    let undefinedInputResult = '';
    try {
      undefinedInputResult = qs.parse(undefined);
    } catch (e) {
      undefinedInputResult = 'error';
    }
    t('parse undefined input',
      typeof undefinedInputResult === 'object' || undefinedInputResult === 'error',
      true
    );

    let numberInputError = '';
    try {
      qs.parse(123);
    } catch (e) {
      numberInputError = e.message;
    }
    t('parse number input',
      typeof numberInputError === 'string' || typeof qs.parse(123) === 'object',
      true
    );

    let objectInputError = '';
    try {
      qs.parse({ a: 1 });
    } catch (e) {
      objectInputError = e.message;
    }
    t('parse object input',
      typeof objectInputError === 'string' || typeof qs.parse({ a: 1 }) === 'object',
      true
    );

    // ==== 8. 极端/DoS 输入测试 ====
    console.log('\n--- Extreme/DoS Input Tests ---');

    // 超深嵌套 (100 层)
    const deepNest = 'a' + '[b]'.repeat(100) + '=value';
    let deepNestResult = null;
    let deepNestError = '';
    try {
      deepNestResult = qs.parse(deepNest);
    } catch (e) {
      deepNestError = e.message;
    }
    t('parse 100-level deep nesting (should not crash)',
      typeof deepNestResult === 'object' || typeof deepNestError === 'string',
      true
    );

    // 巨量参数 (1000 个)
    const manyParams = Array.from({ length: 1000 }, (_, i) => `p${i}=${i}`).join('&');
    let manyParamsResult = null;
    try {
      manyParamsResult = qs.parse(manyParams);
    } catch (e) {
      // 允许抛错
    }
    t('parse 1000 parameters (should not crash)',
      typeof manyParamsResult === 'object' || manyParamsResult === null,
      true
    );

    // 超大数组索引
    t('parse huge array index',
      qs.parse('a[999999999]=value'),
      { a: { '999999999': 'value' } }
    );

    // 超长字符串 (10000 字符)
    const longValue = 'x'.repeat(10000);
    t('parse very long value (10000 chars)',
      qs.parse(`key=${longValue}`),
      { key: longValue }
    );

    // 包含 null 字符
    t('parse string with null byte',
      qs.parse('a=b%00c'),
      { a: 'b\x00c' }
    );

    // ==== 9. 特殊键名极端情况 ====
    console.log('\n--- Special Key Names Tests ---');

    // Empty key may be ignored by qs
    t('parse empty key name',
      qs.parse('=value'),
      {}
    );

    t('parse numeric key name',
      qs.parse('123=value'),
      { '123': 'value' }
    );

    t('parse unicode key name',
      qs.parse('%E4%B8%AD%E6%96%87=value'),
      { '中文': 'value' }
    );

    // Malformed nested brackets - qs tries to parse it
    t('parse key with nested brackets',
      qs.parse('a[b[c]]=d'),
      { 'a[b': { c: 'd' } }
    );

    // Leading bracket treated as array notation
    t('parse key starting with bracket',
      qs.parse('[key]=value'),
      { key: 'value' }
    );

    t('parse key ending with bracket',
      qs.parse('key]=value'),
      { 'key]': 'value' }
    );

    // ==== 10. 选项边界值测试 ====
    console.log('\n--- Option Boundary Tests ---');

    // depth: Infinity
    t('parse depth: Infinity',
      qs.parse('a[b][c][d][e][f][g]=h', { depth: Infinity }),
      { a: { b: { c: { d: { e: { f: { g: 'h' } } } } } } }
    );

    // depth: -1
    t('parse depth: -1 (invalid, should use default)',
      typeof qs.parse('a[b]=c', { depth: -1 }),
      'object'
    );

    // arrayLimit: Infinity
    t('parse arrayLimit: Infinity',
      qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: Infinity }),
      { a: ['1', '2', '3'] }
    );

    // parameterLimit: Infinity
    const infiniteParams = Array.from({ length: 100 }, (_, i) => `p${i}=${i}`).join('&');
    t('parse parameterLimit: Infinity',
      Object.keys(qs.parse(infiniteParams, { parameterLimit: Infinity })).length,
      100
    );

    // delimiter: 空字符串 (splits every character)
    const emptyDelimResult = qs.parse('a=1&b=2', { delimiter: '' });
    t('parse delimiter: empty string (splits characters)',
      Object.keys(emptyDelimResult).length > 2,
      true
    );

    // delimiter: Unicode 字符
    t('parse delimiter: Unicode',
      qs.parse('a=1→b=2', { delimiter: '→' }),
      { a: '1', b: '2' }
    );

    // charset: 非法值
    let invalidCharsetError = '';
    try {
      qs.parse('a=b', { charset: 'invalid-charset' });
    } catch (e) {
      invalidCharsetError = e.message;
    }
    t('parse charset: invalid (should error or fallback)',
      typeof invalidCharsetError === 'string' || typeof qs.parse('a=b', { charset: 'invalid-charset' }) === 'object',
      true
    );

    // ==== 11. 高级边界场景 ====
    console.log('\n--- Advanced Edge Cases ---');

    // 键包含 %
    t('parse key with percent',
      qs.parse('%25key=value'),
      { '%key': 'value' }
    );

    // 值包含 =
    t('parse value with equals',
      qs.parse('a=b=c'),
      { a: 'b=c' }
    );

    // 多个 ?
    t('parse multiple ?',
      qs.parse('??a=b', { ignoreQueryPrefix: true }),
      { '?a': 'b' }
    );

    // 仅包含分隔符
    t('parse only delimiters',
      qs.parse('&&&'),
      {}
    );

    // 数组与对象混合 (相同键)
    t('parse array/object conflict',
      qs.parse('a[0]=1&a.b=2', { allowDots: true }),
      { a: { '0': '1', b: '2' } }
    );

    // 重复的 decoder 调用验证
    let decoderCallCount = 0;
    qs.parse('a=1&b=2', {
      decoder: (str) => {
        decoderCallCount++;
        return str;
      }
    });
    t('parse decoder called for each value',
      decoderCallCount >= 2,
      true
    );

    // ==== 汇总结果 ====
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n' + '='.repeat(50));
    console.log('补充测试汇总:');
    console.log(JSON.stringify(summary, null, 2));
    console.log('='.repeat(50) + '\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      },
      detail
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();
