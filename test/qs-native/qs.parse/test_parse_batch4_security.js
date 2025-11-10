// qs.parse() 批次4: plainObjects + allowPrototypes + strictNullHandling + duplicates + decoder
// 版本: qs v6.14.0
// 用例数: 约 30 个

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

    function tCondition(name, condition) {
      total++;
      const ok = Boolean(condition);
      detail.push({ case: name, pass: ok });
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

    console.log('📦 批次4: plainObjects + allowPrototypes + strictNullHandling + duplicates + decoder\n');

    // plainObjects
    console.log('plainObjects 测试:');
    const plainResult = qs.parse('a=b', { plainObjects: true });
    tCondition('parse plainObjects: true (no hasOwnProperty)', 
      plainResult.hasOwnProperty === undefined);
    tCondition('parse plainObjects: true (no toString)', plainResult.toString === undefined);
    tCondition('parse plainObjects: true (null prototype check)', 
      plainResult.hasOwnProperty === undefined && plainResult.toString === undefined);

    const normalResult = qs.parse('a=b', { plainObjects: false });
    tCondition('parse plainObjects: false (has hasOwnProperty)', 
      typeof normalResult.hasOwnProperty === 'function');
    tCondition('parse plainObjects: false (has toString)', 
      typeof normalResult.toString === 'function');

    // allowPrototypes (安全测试)
    console.log('\nallowPrototypes 测试:');
    t('parse __proto__ blocked (allowPrototypes: false)', 
      qs.parse('__proto__[x]=y&a=1', { allowPrototypes: false }), { a: '1' });
    t('parse constructor.prototype blocked', 
      qs.parse('constructor[prototype][x]=y', { allowPrototypes: false }), {});

    const protoTest1 = qs.parse('__proto__[polluted]=yes', { allowPrototypes: false });
    tCondition('parse __proto__ does not pollute global', ({}).polluted === undefined);

    const protoTest2 = qs.parse('constructor[prototype][injected]=value', { allowPrototypes: false });
    tCondition('parse constructor.prototype does not pollute', ({}).injected === undefined);

    t('parse prototype as normal key', 
      qs.parse('prototype[x]=y', { allowPrototypes: false }), { prototype: { x: 'y' } });

    t('parse __proto__ blocked even with allowPrototypes: true', 
      qs.parse('__proto__[x]=y', { allowPrototypes: true }), {});
    
    const protoTest3 = qs.parse('__proto__[polluted]=yes', { allowPrototypes: true });
    tCondition('parse allowPrototypes: true still safe', ({}).polluted === undefined);

    t('parse constructor key (allowPrototypes: true)', 
      qs.parse('constructor[x]=y', { allowPrototypes: true }), { constructor: { x: 'y' } });

    // strictNullHandling
    console.log('\nstrictNullHandling 测试:');
    t('parse strictNullHandling: false (key only)', 
      qs.parse('a', { strictNullHandling: false }), { a: '' });
    t('parse strictNullHandling: true (key only -> null)', 
      qs.parse('a', { strictNullHandling: true }), { a: null });
    t('parse strictNullHandling: true (empty value)', 
      qs.parse('a=', { strictNullHandling: true }), { a: '' });
    t('parse strictNullHandling: true (multiple keys)', 
      qs.parse('a&b&c', { strictNullHandling: true }), { a: null, b: null, c: null });
    t('parse strictNullHandling: true (mixed)', 
      qs.parse('a&b=value&c=', { strictNullHandling: true }), { a: null, b: 'value', c: '' });
    t('parse strictNullHandling: true (nested)', 
      qs.parse('a[b]&a[c]=d', { strictNullHandling: true }), { a: { b: null, c: 'd' } });

    // duplicates
    console.log('\nduplicates 测试:');
    t('parse duplicates: combine (default)', qs.parse('a=1&a=2&a=3'), { a: ['1', '2', '3'] });
    t('parse duplicates: first', qs.parse('a=1&a=2&a=3', { duplicates: 'first' }), { a: '1' });
    t('parse duplicates: last', qs.parse('a=1&a=2&a=3', { duplicates: 'last' }), { a: '3' });
    t('parse duplicates: combine', qs.parse('a=1&a=2', { duplicates: 'combine' }), { a: ['1', '2'] });

    // decoder
    console.log('\ndecoder 测试:');
    t('parse decoder: double values', 
      qs.parse('a=1&b=2', { decoder: (str) => String(parseInt(str) * 2 || str) }), 
      { a: '2', b: '4' });
    t('parse decoder: uppercase keys', 
      qs.parse('a=value', { decoder: (str, defaultDecoder, charset, type) => 
        type === 'key' ? str.toUpperCase() : str }), 
      { A: 'value' });

    const decoderUndefined = qs.parse('a=1', { decoder: () => undefined });
    tCondition('parse decoder returns undefined', 'undefined' in decoderUndefined);

    const decoderNull = qs.parse('a=1', { decoder: () => null });
    tCondition('parse decoder returns null', decoderNull.null === null || 'null' in decoderNull);

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次4测试汇总:', JSON.stringify(summary, null, 2));
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

