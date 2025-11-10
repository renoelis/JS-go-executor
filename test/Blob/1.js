// Blob/File API 综合测试
// 包含优化后功能的完整测试

var input = {
    "text": "你好，Blob！",
    "contentType": "text/plain; charset=utf-8",
    "binaryUrl": "https://httpbin.qingflow.dpdns.org/bytes/128",
    "filename": "hello.txt",
    "echoUrl": "https://httpbin.qingflow.dpdns.org/post",
    "useNativeOnly": false
  }
  
  function createBlobShim() {
    // 轻量级 Blob 兼容实现（仅覆盖本脚本所需 API）
    class BlobShim {
      constructor(parts = [], opts = {}) {
        // 规范化输入为 Buffer
        const buffers = [];
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (p == null) continue;
          if (typeof p === 'string') {
            buffers.push(Buffer.from(p, 'utf8'));
          } else if (p instanceof ArrayBuffer) {
            buffers.push(Buffer.from(new Uint8Array(p)));
          } else if (ArrayBuffer.isView && ArrayBuffer.isView(p)) {
            buffers.push(Buffer.from(p.buffer, p.byteOffset, p.byteLength));
          } else if (p instanceof Buffer) {
            buffers.push(p);
          } else if (typeof p === 'object' && typeof p.text === 'function' && typeof p.arrayBuffer === 'function') {
            // 其他类 Blob 对象
            // 同步无法读取，尽力而为：跳过或抛错，这里选择抛错更安全
            throw new Error('Unsupported part type in BlobShim');
          } else {
            // 尝试字符串化
            buffers.push(Buffer.from(String(p), 'utf8'));
          }
        }
        this._buf = buffers.length === 0 ? Buffer.alloc(0) : Buffer.concat(buffers);
        this._type = (opts.type || '').toLowerCase();
        // 仅暴露只读属性（避免使用 Object.defineProperty）
        this.size = this._buf.length;
        this.type = this._type;
      }
      async text() {
        return this._buf.toString('utf8');
      }
      async arrayBuffer() {
        const ab = new ArrayBuffer(this._buf.length);
        const u8 = new Uint8Array(ab);
        for (let i = 0; i < this._buf.length; i++) u8[i] = this._buf[i];
        return ab;
      }
      slice(start, end, type) {
        const len = this._buf.length;
        let s = start == null ? 0 : (start < 0 ? Math.max(len + start, 0) : Math.min(start, len));
        let e = end == null ? len : (end < 0 ? Math.max(len + end, 0) : Math.min(end, len));
        if (e < s) e = s;
        const sliced = this._buf.slice(s, e);
        return new BlobShim([sliced], { type: (type || this._type || '').toLowerCase() });
      }
    }
    return BlobShim;
  }
  
  async function maybeFetchBinary(url) {
    if (!url) return null;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error('下载二进制失败：' + res.status + ' ' + res.statusText);
    }
    // 优先 arrayBuffer
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  }
  
  function toHexPreview(u8, max = 32) {
    if (!u8) return '';
    const len = Math.min(u8.length, max);
    let out = [];
    for (let i = 0; i < len; i++) {
      const h = u8[i].toString(16).toUpperCase().padStart(2, '0');
      out.push(h);
    }
    return out.join(' ');
  }
  
  async function uploadWithFormData(opts) {
    const { echoUrl, blob, fieldName, filename } = opts;
    if (!echoUrl) return { skipped: true, reason: '未提供 echoUrl，跳过上传测试' };
  
    // 这里使用 WHATWG FormData（全局可用），能与 fetch 直接兼容
    const fd = new FormData();
    // 如果是 Blob（或兼容实现），可直接附带文件名
    if (blob) {
      fd.append(fieldName || 'file', blob, filename || 'test.bin');
    }
  
    // 附带一些额外字段，帮助回显验证
    fd.append('meta', JSON.stringify({ from: 'blob-selftest', ts: Date.now() }));
  
    const res = await fetch(echoUrl, { method: 'POST', body: fd });
    const contentType = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
    let bodyText = '';
    try {
      // 常见回显服务返回 JSON
      bodyText = await res.text();
    } catch (e) {
      bodyText = '';
    }
  
    return {
      skipped: false,
      ok: res.ok,
      status: res.status,
      contentType,
      bodyPreview: bodyText ? (bodyText.length > 500 ? bodyText.slice(0, 500) + '…' : bodyText) : ''
    };
  }
  
  // ============================================================================
  // 🔥 新增：优化后功能的专项测试
  // ============================================================================
  
  function testOptimizations() {
    const results = {};
    
    // 测试 1: Blob.bytes() 方法（使用了优化的 Uint8Array 构造函数）
    results.bytesMethod = (function() {
      try {
        const blob = new Blob(["Hello"]);
        if (typeof blob.bytes !== 'function') {
          return { supported: false, reason: 'bytes() 方法不存在' };
        }
        
        // bytes() 返回 Promise<Uint8Array>
        return { 
          supported: true, 
          note: 'bytes() 方法存在（异步测试在 main 中）'
        };
      } catch (e) {
        return { supported: false, error: e.message };
      }
    })();
    
    // 测试 2: Symbol.toStringTag（验证优化后的属性设置）
    results.symbolToStringTag = (function() {
      try {
        const blob = new Blob([]);
        const tag = Object.prototype.toString.call(blob);
        return {
          ok: tag === '[object Blob]',
          actual: tag,
          expected: '[object Blob]'
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })();
    
    // 测试 3: File 的 Symbol.toStringTag
    results.fileToStringTag = (function() {
      try {
        if (typeof File === 'undefined') {
          return { supported: false, reason: 'File 构造函数不存在' };
        }
        const file = new File(["content"], "test.txt");
        const tag = Object.prototype.toString.call(file);
        return {
          ok: tag === '[object File]',
          actual: tag,
          expected: '[object File]'
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })();
    
    // 测试 4: Blob.prototype 上的方法是否不可枚举（优化后的属性描述符）
    results.methodsNonEnumerable = (function() {
      try {
        const blob = new Blob([]);
        const methods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
        
        // 使用 for...in 检查方法是否可枚举（避免使用 getOwnPropertyDescriptor）
        const enumerableProps = [];
        for (const key in Blob.prototype) {
          enumerableProps.push(key);
        }
        
        // 检查方法是否出现在可枚举列表中
        const enumResults = {};
        for (const method of methods) {
          enumResults[method] = enumerableProps.includes(method);
        }
        
        // 所有方法都不应该在可枚举列表中
        const allNonEnum = methods.every(m => enumResults[m] === false);
        
        return {
          ok: allNonEnum,
          details: enumResults,
          expected: 'all false (non-enumerable)'
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })();
    
    // 测试 5: constructor 属性是否不可枚举
    results.constructorNonEnumerable = (function() {
      try {
        // 使用 for...in 检查 constructor 是否可枚举
        const blobEnumProps = [];
        for (const key in Blob.prototype) {
          blobEnumProps.push(key);
        }
        const blobOk = !blobEnumProps.includes('constructor');
        
        let fileOk = true;
        if (typeof File !== 'undefined') {
          const fileEnumProps = [];
          for (const key in File.prototype) {
            fileEnumProps.push(key);
          }
          fileOk = !fileEnumProps.includes('constructor');
        }
        
        return {
          ok: blobOk && fileOk,
          blob: {
            enumerable: !blobOk,
            expected: false
          },
          file: typeof File !== 'undefined' ? {
            enumerable: !fileOk,
            expected: false
          } : { skipped: true }
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })();
    
    // 测试 6: Blob/File 继承关系
    results.inheritance = (function() {
      try {
        if (typeof File === 'undefined') {
          return { supported: false, reason: 'File 不存在' };
        }
        
        const file = new File(["content"], "test.txt");
        const isBlob = file instanceof Blob;
        const isFile = file instanceof File;
        
        // 验证 File 继承了 Blob 的方法（避免使用 Object.getPrototypeOf）
        const hasBlobMethods = typeof file.text === 'function' 
          && typeof file.arrayBuffer === 'function'
          && typeof file.slice === 'function';
        
        return {
          ok: isBlob && isFile && hasBlobMethods,
          fileInstanceOfBlob: isBlob,
          fileInstanceOfFile: isFile,
          hasBlobMethods: hasBlobMethods,
          note: '通过 instanceof 和方法继承验证'
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })();
    
    return results;
  }
  
  async function main() {
    try {
      // ===== 读取输入 =====
      const textInput = (input && input.text) || 'Hello, Blob!';
      const binUrl = input && input.binaryUrl;
      const desiredType = (input && input.contentType) || 'text/plain';
      const filename = (input && input.filename) || 'sample.txt';
      const echoUrl = input && input.echoUrl;
      const useNativeOnly = !!(input && input.useNativeOnly);
  
      // ===== Blob / 兼容实现选择 =====
      const hasNativeBlob = typeof Blob !== 'undefined';
      let BlobCtor = hasNativeBlob ? Blob : createBlobShim();
  
      if (useNativeOnly && !hasNativeBlob) {
        throw new Error('当前环境不存在原生 Blob，且 useNativeOnly=true。');
      }
  
      // ===== 🔥 新增：运行优化功能测试 =====
      const optimizationTests = testOptimizations();
  
      // ===== 用例 1：从字符串创建 Blob 并读取 =====
      const textBlob = new BlobCtor([textInput], { type: desiredType });
      const textFromBlob = await textBlob.text();
      const ab1 = await textBlob.arrayBuffer();
      const u81 = new Uint8Array(ab1);
  
      // ===== 🔥 新增：测试 bytes() 方法（使用了优化的 Uint8Array 构造函数）=====
      let bytesTest = null;
      if (hasNativeBlob && typeof textBlob.bytes === 'function') {
        try {
          const uint8Array = await textBlob.bytes();
          bytesTest = {
            ok: true,
            isUint8Array: uint8Array instanceof Uint8Array,
            length: uint8Array.length,
            firstBytes: Array.from(uint8Array.slice(0, 10)),
            matchesOriginal: uint8Array.length === textBlob.size
          };
        } catch (e) {
          bytesTest = { ok: false, error: e.message };
        }
      } else {
        bytesTest = { skipped: true, reason: 'bytes() 方法不可用' };
      }
  
      // ===== 用例 2：从二进制创建 Blob（若提供 binaryUrl）=====
      let binStats = null;
      if (binUrl) {
        const u8 = await maybeFetchBinary(binUrl);
        const binBlob = new BlobCtor([u8], { type: 'application/octet-stream' });
        const ab2 = await binBlob.arrayBuffer();
        const u82 = new Uint8Array(ab2);
        const sliceMid = Math.floor(u82.length / 2);
        const sliced = binBlob.slice(sliceMid, sliceMid + Math.min(32, Math.max(0, u82.length - sliceMid)));
        const abSlice = await sliced.arrayBuffer();
        const u8Slice = new Uint8Array(abSlice);
        
        binStats = {
          sourceUrl: binUrl,
          blobSize: binBlob.size,
          type: binBlob.type,
          headHex: toHexPreview(u82, 32),
          tailHex: toHexPreview(u82.slice(Math.max(0, u82.length - 32))),
          slicePreviewHex: toHexPreview(u8Slice, 32)
        };
        
        // 🔥 新增：对二进制 Blob 也测试 bytes() 方法
        if (hasNativeBlob && typeof binBlob.bytes === 'function') {
          try {
            const binUint8 = await binBlob.bytes();
            binStats.bytesMethodOk = binUint8.length === binBlob.size;
          } catch (e) {
            binStats.bytesMethodError = e.message;
          }
        }
      }
  
      // ===== 用例 3：slice 功能（针对文本 Blob）=====
      const sliceStart = 1;
      const sliceEnd = Math.min(6, textBlob.size);
      const textSlice = textBlob.slice(sliceStart, sliceEnd, desiredType);
      const textSliceContent = await textSlice.text();
  
      // ===== 用例 4：与 FormData / fetch 联调（可选）=====
      let uploadResult = null;
      if (echoUrl) {
        // 统一使用文本 Blob 测试上传
        uploadResult = await uploadWithFormData({
          echoUrl,
          blob: textBlob,
          filename,
          fieldName: 'file'
        });
      }
  
      // ===== 🔥 新增：File API 专项测试 =====
      let fileTests = null;
      if (typeof File !== 'undefined') {
        try {
          const now = Date.now();
          const file = new File([textInput], filename, { 
            type: desiredType, 
            lastModified: now 
          });
          
          fileTests = {
            ok: true,
            name: file.name,
            nameMatches: file.name === filename,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            lastModifiedMatches: file.lastModified === now,
            instanceOfBlob: file instanceof Blob,
            instanceOfFile: file instanceof File,
            // 测试 File 的方法继承
            hasText: typeof file.text === 'function',
            hasArrayBuffer: typeof file.arrayBuffer === 'function',
            hasSlice: typeof file.slice === 'function'
          };
          
          // 测试 File 继承的方法
          const fileText = await file.text();
          fileTests.textWorks = fileText === textInput;
          
        } catch (e) {
          fileTests = { ok: false, error: e.message };
        }
      } else {
        fileTests = { supported: false, reason: 'File 构造函数不存在' };
      }
  
      // ===== 汇总结果 =====
      const result = {
        environment: {
          hasNativeBlob: hasNativeBlob,
          hasNativeFile: typeof File !== 'undefined',
          impl: hasNativeBlob ? 'native-Blob' : 'buffer-blob-shim',
          contentTypeRequested: desiredType
        },
        
        // 🔥 优化后功能测试（新增）
        optimizationTests: optimizationTests,
        
        cases: {
          createFromText: {
            ok: textFromBlob === textInput,
            size: textBlob.size,
            type: textBlob.type,
            readback: textFromBlob,
            hexPreview: toHexPreview(u81, 32)
          },
          
          // 🔥 新增：bytes() 方法测试
          bytesMethod: bytesTest,
          
          sliceOnText: {
            sliceRange: [sliceStart, sliceEnd],
            sliceSize: textSlice.size,
            sliceType: textSlice.type,
            sliceReadback: textSliceContent
          },
          
          createFromBinary: binStats || { skipped: true, reason: '未提供 binaryUrl' },
          
          formDataUpload: uploadResult || { skipped: true, reason: '未提供 echoUrl' },
          
          // 🔥 新增：File API 测试
          fileAPI: fileTests
        }
      };
  
      console.log(JSON.stringify({ success: true, data: result }, null, 2));
    } catch (error) {
      console.log(JSON.stringify({ success: false, error: error.message, stack: error.stack }, null, 2));
    }
  }
  
main();
  
  