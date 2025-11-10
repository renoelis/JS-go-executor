// qs.parse() 完整覆盖测试脚本
// 版本: qs v6.14.0
// 目标: 100% 对齐 qs.parse 的所有行为

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

    // ==== 基本功能测试 ====
    t('parse empty string', qs.parse(''), {});
    t('parse single param', qs.parse('a=b'), { a: 'b' });
    t('parse multiple params', qs.parse('a=b&c=d'), { a: 'b', c: 'd' });
    t('parse without value', qs.parse('a'), { a: '' });
    t('parse equals without value', qs.parse('a='), { a: '' });

    // ==== 嵌套对象测试 ====
    t('parse basic nesting', qs.parse('foo[bar]=baz'), { foo: { bar: 'baz' } });
    t('parse deep nesting', qs.parse('a[b][c][d]=e'), { a: { b: { c: { d: 'e' } } } });
    t('parse multiple nested', qs.parse('a[b]=1&a[c]=2'), { a: { b: '1', c: '2' } });

    // ==== 数组测试 ====
    t('parse array empty brackets', qs.parse('a[]=b&a[]=c'), { a: ['b', 'c'] });
    t('parse array indexed', qs.parse('a[0]=b&a[1]=c'), { a: ['b', 'c'] });
    t('parse array out of order', qs.parse('a[1]=b&a[0]=c'), { a: ['c', 'b'] });
    t('parse array single item', qs.parse('a[]=b'), { a: ['b'] });

    // ==== ignoreQueryPrefix 测试 ====
    t('parse with ? prefix (ignoreQueryPrefix: true)',
      qs.parse('?a=b&c=d', { ignoreQueryPrefix: true }),
      { a: 'b', c: 'd' }
    );
    t('parse with ? prefix (ignoreQueryPrefix: false)',
      qs.parse('?a=b&c=d', { ignoreQueryPrefix: false }),
      { '?a': 'b', c: 'd' }
    );
    t('parse without ? (ignoreQueryPrefix: true)',
      qs.parse('a=b', { ignoreQueryPrefix: true }),
      { a: 'b' }
    );

    // ==== allowDots 测试 ====
    t('parse dots (allowDots: false)',
      qs.parse('a.b=c', { allowDots: false }),
      { 'a.b': 'c' }
    );
    t('parse dots (allowDots: true)',
      qs.parse('a.b=c', { allowDots: true }),
      { a: { b: 'c' } }
    );
    t('parse dots deep (allowDots: true)',
      qs.parse('a.b.c.d=e', { allowDots: true }),
      { a: { b: { c: { d: 'e' } } } }
    );
    t('parse dots and brackets (allowDots: true)',
      qs.parse('a.b[c]=d', { allowDots: true }),
      { a: { b: { c: 'd' } } }
    );

    // ==== depth 测试 ====
    t('parse depth limit (depth: 1)',
      qs.parse('a[b][c]=d', { depth: 1 }),
      { a: { b: { '[c]': 'd' } } }
    );
    t('parse depth limit (depth: 2)',
      qs.parse('a[b][c][d]=e', { depth: 2 }),
      { a: { b: { c: { '[d]': 'e' } } } }
    );
    t('parse depth limit (depth: 0)',
      qs.parse('a[b]=c', { depth: 0 }),
      { 'a[b]': 'c' }
    );

    // ==== parameterLimit 测试 ====
    t('parse parameterLimit (limit: 2)',
      qs.parse('a=1&b=2&c=3', { parameterLimit: 2 }),
      { a: '1', b: '2' }
    );
    t('parse parameterLimit (limit: 1)',
      qs.parse('a=1&b=2', { parameterLimit: 1 }),
      { a: '1' }
    );

    // ==== arrayLimit 测试 ====
    t('parse arrayLimit (limit: 2)',
      qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: 2 }),
      { a: { '0': '1', '1': '2', '2': '3' } }
    );
    t('parse arrayLimit (limit: 0)',
      qs.parse('a[]=1&a[]=2', { arrayLimit: 0 }),
      { a: { '0': '1', '1': '2' } }
    );

    // ==== parseArrays 测试 ====
    t('parse parseArrays: false',
      qs.parse('a[0]=1&a[1]=2', { parseArrays: false }),
      { a: { '0': '1', '1': '2' } }
    );
    t('parse parseArrays: true',
      qs.parse('a[0]=1&a[1]=2', { parseArrays: true }),
      { a: ['1', '2'] }
    );

    // ==== comma 测试 ====
    t('parse comma: false',
      qs.parse('a=b,c', { comma: false }),
      { a: 'b,c' }
    );
    t('parse comma: true',
      qs.parse('a=b,c', { comma: true }),
      { a: ['b', 'c'] }
    );
    t('parse comma with multiple params',
      qs.parse('a=1,2&b=3,4', { comma: true }),
      { a: ['1', '2'], b: ['3', '4'] }
    );

    // ==== delimiter 测试 ====
    t('parse delimiter: ;',
      qs.parse('a=1;b=2', { delimiter: ';' }),
      { a: '1', b: '2' }
    );
    t('parse delimiter: |',
      qs.parse('a=1|b=2|c=3', { delimiter: '|' }),
      { a: '1', b: '2', c: '3' }
    );
    t('parse delimiter: regex',
      qs.parse('a=1;b=2&c=3', { delimiter: /[;&]/ }),
      { a: '1', b: '2', c: '3' }
    );

    // ==== charset 测试 ====
    t('parse charset: utf-8 (default)',
      qs.parse('a=%E4%B8%AD%E6%96%87', { charset: 'utf-8' }),
      { a: '中文' }
    );
    t('parse charset: iso-8859-1',
      qs.parse('a=%A3%BF', { charset: 'iso-8859-1' }),
      { a: '£¿' }
    );

    // ==== charsetSentinel 测试 ====
    t('parse charsetSentinel: true (with utf8 sentinel)',
      qs.parse('utf8=%E2%9C%93&a=%E4%B8%AD', { charsetSentinel: true }),
      { a: '中' }
    );
    t('parse charsetSentinel: true (without sentinel)',
      qs.parse('a=b', { charsetSentinel: true }),
      { a: 'b' }
    );

    // ==== plainObjects 测试 ====
    const plainResult = qs.parse('a=b', { plainObjects: true });
    t('parse plainObjects: true (check hasOwnProperty)',
      plainResult.hasOwnProperty === undefined,
      true
    );

    const normalResult = qs.parse('a=b', { plainObjects: false });
    t('parse plainObjects: false (has hasOwnProperty)',
      typeof normalResult.hasOwnProperty === 'function',
      true
    );

    // ==== allowPrototypes 测试 (安全相关) ====
    t('parse allowPrototypes: false (block __proto__)',
      qs.parse('__proto__[x]=y&a=1', { allowPrototypes: false }),
      { a: '1' }
    );

    const protoTest1 = qs.parse('__proto__[x]=y', { allowPrototypes: false });
    t('parse __proto__ blocked (check pollution)',
      ({}).x === undefined && typeof protoTest1 === 'object',
      true
    );

    const protoTest2 = qs.parse('constructor[prototype][x]=y', { allowPrototypes: false });
    t('parse constructor.prototype blocked',
      ({}).x === undefined,
      true
    );

    // ==== decoder 自定义测试 ====
    t('parse custom decoder',
      qs.parse('a=1&b=2', {
        decoder: function(str) { return String(parseInt(str) * 2 || str); }
      }),
      { a: '2', b: '4' }
    );

    // ==== 编码处理测试 ====
    t('parse URL encoded space (%20)', qs.parse('a=hello%20world'), { a: 'hello world' });
    t('parse plus as space', qs.parse('a=hello+world'), { a: 'hello world' });
    t('parse encoded special chars', qs.parse('a=%21%40%23%24'), { a: '!@#$' });
    t('parse unicode', qs.parse('a=%E2%9C%93'), { a: '✓' });

    // ==== 边界和异常输入测试 ====
    t('parse empty value', qs.parse('a=&b=c'), { a: '', b: 'c' });
    t('parse only key', qs.parse('a&b'), { a: '', b: '' });
    t('parse trailing &', qs.parse('a=1&'), { a: '1' });
    t('parse leading &', qs.parse('&a=1'), { a: '1' });
    t('parse multiple &', qs.parse('a=1&&b=2'), { a: '1', b: '2' });
    t('parse only ?', qs.parse('?', { ignoreQueryPrefix: true }), {});
    t('parse only &', qs.parse('&'), {});
    t('parse only =', qs.parse('='), {});

    // ==== 数组边界测试 ====
    t('parse sparse array', qs.parse('a[0]=1&a[2]=3'), { a: ['1', '3'] });
    t('parse array gap', qs.parse('a[0]=1&a[5]=6'), { a: ['1', '6'] });

    // ==== 重复键测试 ====
    t('parse duplicate keys (default)', qs.parse('a=1&a=2'), { a: ['1', '2'] });
    t('parse duplicate keys nested', qs.parse('a[b]=1&a[b]=2'), { a: { b: ['1', '2'] } });

    // ==== 复杂嵌套测试 ====
    t('parse complex nested',
      qs.parse('a[b][c]=1&a[b][d]=2&a[e]=3'),
      { a: { b: { c: '1', d: '2' }, e: '3' } }
    );

    t('parse array of objects',
      qs.parse('a[0][b]=1&a[0][c]=2&a[1][b]=3'),
      { a: [{ b: '1', c: '2' }, { b: '3' }] }
    );

    // ==== 特殊字符键名测试 ====
    t('parse key with space', qs.parse('a%20b=c'), { 'a b': 'c' });
    t('parse key with special chars', qs.parse('a%21%40=b'), { 'a!@': 'b' });

    // ==== 超长输入测试 ====
    const longKey = 'a'.repeat(100);
    const longValue = 'b'.repeat(100);
    t('parse long key', qs.parse(`${longKey}=value`), { [longKey]: 'value' });
    t('parse long value', qs.parse(`key=${longValue}`), { key: longValue });

    // ==== 深层嵌套测试 (测试默认 depth: 5) ====
    t('parse depth 5 nesting',
      qs.parse('a[b][c][d][e]=f'),
      { a: { b: { c: { d: { e: 'f' } } } } }
    );

    t('parse depth 6+ nesting (default limit)',
      qs.parse('a[b][c][d][e][f]=g'),
      { a: { b: { c: { d: { e: { f: 'g' } } } } } }
    );

    // ==== 混合数组和对象测试 ====
    t('parse mixed array and object',
      qs.parse('a[0]=1&a[b]=2'),
      { a: { '0': '1', b: '2' } }
    );

    // ==== 空数组测试 (如果支持 allowEmptyArrays) ====
    t('parse empty array notation', qs.parse('a[]'), { a: [''] });

    // ==== 异常编码测试 ====
    t('parse incomplete percent encoding', qs.parse('a=%'), { a: '%' });
    t('parse malformed percent encoding', qs.parse('a=%ZZ'), { a: '%ZZ' });

    // ==== decoder 类型错误测试 ====
    let decoderError = '';
    try {
      qs.parse('a=1', { decoder: 123 });
    } catch (e) {
      decoderError = e && e.message || 'error';
    }
    t('parse decoder type error (should error or handle)',
      typeof decoderError === 'string' || typeof qs.parse('a=1', { decoder: 123 }) === 'object',
      true
    );

    // ==== 同时使用 allowDots 和数组测试 ====
    t('parse allowDots with array',
      qs.parse('a.b[0]=1&a.b[1]=2', { allowDots: true }),
      { a: { b: ['1', '2'] } }
    );

    // ==== 值为空的各种情况 ====
    t('parse multiple empty values', qs.parse('a=&b=&c='), { a: '', b: '', c: '' });
    t('parse no equals multiple keys', qs.parse('a&b&c'), { a: '', b: '', c: '' });

    // ==== 特殊情况：只有键的嵌套 ====
    t('parse nested without value', qs.parse('a[b][c]'), { a: { b: { c: '' } } });

    // ==== 原型污染高级测试 ====
    t('parse prototype key (allowed as normal key)',
      qs.parse('prototype[x]=y', { allowPrototypes: false }),
      { prototype: { x: 'y' } }
    );

    // 验证全局对象未被污染
    const testObj = {};
    qs.parse('__proto__[polluted]=yes', { allowPrototypes: false });
    t('parse global object not polluted',
      testObj.polluted === undefined,
      true
    );

    // ==== delimiter 和 allowDots 组合 ====
    t('parse delimiter ; with allowDots',
      qs.parse('a.b=1;c.d=2', { delimiter: ';', allowDots: true }),
      { a: { b: '1' }, c: { d: '2' } }
    );

    // ==== 大量参数测试 (parameterLimit) ====
    const manyParams = Array.from({ length: 10 }, (_, i) => `p${i}=${i}`).join('&');
    const manyResult = qs.parse(manyParams, { parameterLimit: 5 });
    t('parse many parameters with limit',
      Object.keys(manyResult).length === 5,
      true
    );

    // ==== 数组索引非连续测试 ====
    t('parse non-sequential array indices',
      qs.parse('a[1]=b&a[3]=d&a[2]=c'),
      { a: ['b', 'c', 'd'] }
    );

    // ==== 零索引数组测试 ====
    t('parse zero-indexed array',
      qs.parse('a[0]=first'),
      { a: ['first'] }
    );

    // ==== 汇总结果 ====
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n' + '='.repeat(50));
    console.log('测试汇总:');
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
      summary: { total, pass, fail: total - pass },
      detail
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();
