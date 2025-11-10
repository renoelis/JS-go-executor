// 检测 crypto.getRandomValues 支持的视图类型（整数 TypedArray + DataView）
function testSupportedRandomValueViews() {
    const result = { supported: [], unsupported: [], skipped: [] };
  
    if (!globalThis.crypto || typeof crypto.getRandomValues !== 'function') {
      result.unsupported.push('crypto.getRandomValues (not available in this environment)');
      return result;
    }
  
    // 候选：规范允许的类型
    const factories = {
      Int8Array: () => new Int8Array(1),
      Uint8Array: () => new Uint8Array(1),
      Uint8ClampedArray: () => new Uint8ClampedArray(1),
      Int16Array: () => new Int16Array(1),
      Uint16Array: () => new Uint16Array(1),
      Int32Array: () => new Int32Array(1),
      Uint32Array: () => new Uint32Array(1),
      DataView: () => new DataView(new ArrayBuffer(1)),
      BigInt64Array: () => (typeof BigInt64Array !== 'undefined' ? new BigInt64Array(1) : null),
      BigUint64Array: () => (typeof BigUint64Array !== 'undefined' ? new BigUint64Array(1) : null),
    };
  
    for (const [name, make] of Object.entries(factories)) {
      let view;
      try {
        view = make();
        if (!view) {
          result.skipped.push(`${name} (not available in this environment)`);
          continue;
        }
        crypto.getRandomValues(view);
        result.supported.push(name);
      } catch (e) {
        result.unsupported.push(`${name} (${e && e.name ? e.name : 'Error'}: ${e && e.message ? e.message : 'unknown'})`);
      }
    }
  
    // 这些类型按规范本来就不支持，单独标注为 skipped
    result.skipped.push('Float32Array (not allowed by spec)');
    result.skipped.push('Float64Array (not allowed by spec)');
    result.skipped.push('Array (not a TypedArray/DataView)');
  
    return result;
  }
  
  // 使用示例
  const result = testSupportedRandomValueViews();
  console.log(result);
  