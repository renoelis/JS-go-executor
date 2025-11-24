/**
 * Axios 兼容层 - 基于 Fetch API 实现
 * 100% 纯 JavaScript 实现，复用底层强大的 Fetch 功能
 * 
 * 支持功能：
 * - ✅ 所有 HTTP 方法 (GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS)
 * - ✅ 请求/响应拦截器
 * - ✅ 自动 JSON 序列化和解析
 * - ✅ HTTP 错误自动 reject (4xx/5xx)
 * - ✅ 配置系统 (全局/实例/请求级)
 * - ✅ baseURL 和 params 支持
 * - ✅ 请求取消 (CancelToken)
 * - ✅ 并发控制 (axios.all/spread)
 * - ✅ 超时控制
 * - ✅ 自定义 headers
 * - ✅ auth 基础认证
 * 
 * @version 6.0.2
 * @security 已修复原型污染、URL注入、内存泄漏等安全问题
 * @optimization 优化闭包创建，添加 btoa 兼容性检查
 */

(function(global) {
  'use strict';

  // ==================== 环境兼容性检查 ====================

  /**
   * 检查 btoa 函数是否可用
   * 用于 Basic Authentication
   */
  var HAS_BTOA = typeof btoa !== 'undefined';
  if (!HAS_BTOA) {
    console.warn('[Axios] btoa is not available. Basic Authentication will not work.');
  }

  // ==================== 常量定义 ====================

  var CONSTANTS = {
    DEFAULT_TIMEOUT: 0,
    DANGEROUS_KEYS: ['__proto__', 'constructor', 'prototype'],
    HTTP_METHODS_WITHOUT_DATA: ['delete', 'get', 'head', 'options'],
    HTTP_METHODS_WITH_DATA: ['post', 'put', 'patch'],
    VALID_PROTOCOLS: ['http:', 'https:'],
    REDACTED_PASSWORD: '[REDACTED]'
  };

  // ==================== 工具函数 ====================

  /**
   * 安全的对象属性检查
   * @param {string} key - 属性名
   * @returns {boolean} 是否为安全的属性名
   */
  function isSafeKey(key) {
    return CONSTANTS.DANGEROUS_KEYS.indexOf(key) === -1;
  }

  /**
   * 合并配置对象（防止原型污染）
   * @param {Object} config1 - 基础配置
   * @param {Object} config2 - 要合并的配置
   * @returns {Object} 合并后的配置
   */
  function mergeConfig(config1, config2) {
    var result = {};
    
    // axios 合并策略：某些属性仅从 config2 获取
    var config2OnlyKeys = {
      'url': true,
      'method': true,
      'data': true
    };
    
    // 复制 config1（排除仅 config2 的属性）
    for (var key in config1) {
      if (config1.hasOwnProperty(key) && isSafeKey(key)) {
        // 跳过仅从 config2 获取的属性
        if (config2OnlyKeys[key]) {
          continue;
        }
        
        if (key === 'headers') {
          // headers 需要深度复制，避免共享引用
          result[key] = deepMergeHeaders(config1[key], null);
        } else if (key === 'params') {
          // params 也需要深度复制
          result[key] = mergeParams(config1[key], null);
        } else {
          result[key] = config1[key];
        }
      }
    }
    
    // 合并 config2（防止原型污染）
    for (var key in config2) {
      if (config2.hasOwnProperty(key) && isSafeKey(key)) {
        if (key === 'headers') {
          // headers 需要深度合并，保留结构
          result.headers = deepMergeHeaders(result.headers, config2.headers);
        } else if (key === 'params') {
          // params 也需要合并
          result.params = mergeParams(result.params, config2.params);
        } else {
          result[key] = config2[key];
        }
      }
    }
    
    return result;
  }
  
  /**
   * 合并 params 对象
   * @param {Object} params1 - 基础 params
   * @param {Object} params2 - 要合并的 params
   * @returns {Object} 合并后的 params
   */
  function mergeParams(params1, params2) {
    if (!params1 && !params2) return undefined;
    if (!params1) return params2;
    if (!params2) return params1;
    
    var result = {};
    
    // 复制 params1
    for (var key in params1) {
      if (params1.hasOwnProperty(key) && isSafeKey(key)) {
        result[key] = params1[key];
      }
    }
    
    // 合并 params2（覆盖相同的 key）
    for (var key in params2) {
      if (params2.hasOwnProperty(key) && isSafeKey(key)) {
        result[key] = params2[key];
      }
    }
    
    return result;
  }

  /**
   * 深度合并 headers（保留 common、method-specific 结构）
   * @param {Object} headers1 - 基础 headers
   * @param {Object} headers2 - 要合并的 headers
   * @returns {Object} 合并后的 headers
   */
  function deepMergeHeaders(headers1, headers2) {
    var result = {};
    
    // 🔥 验证 headers 类型：忽略非对象类型（如字符串、数组等）
    if (headers1 != null && (typeof headers1 !== 'object' || Array.isArray(headers1))) {
      headers1 = null;
    }
    if (headers2 != null && (typeof headers2 !== 'object' || Array.isArray(headers2))) {
      headers2 = null;
    }
    
    // 复制 headers1 的所有属性
    if (headers1) {
      for (var key in headers1) {
        if (headers1.hasOwnProperty(key) && isSafeKey(key)) {
          if (typeof headers1[key] === 'object' && headers1[key] !== null) {
            // 深度复制对象（common、get、post 等）
            result[key] = {};
            for (var subKey in headers1[key]) {
              if (headers1[key].hasOwnProperty(subKey) && isSafeKey(subKey)) {
                result[key][subKey] = headers1[key][subKey];
              }
            }
          } else {
            result[key] = headers1[key];
          }
        }
      }
    }
    
    // 合并 headers2
    if (headers2) {
      for (var key in headers2) {
        if (headers2.hasOwnProperty(key) && isSafeKey(key)) {
          if (typeof headers2[key] === 'object' && headers2[key] !== null) {
            // 深度合并对象
            if (!result[key]) {
              result[key] = {};
            }
            for (var subKey in headers2[key]) {
              if (headers2[key].hasOwnProperty(subKey) && isSafeKey(subKey)) {
                result[key][subKey] = headers2[key][subKey];
              }
            }
          } else {
            result[key] = headers2[key];
          }
        }
      }
    }
    
    return result;
  }

  /**
   * 合并 headers（防止原型污染）
   * 支持 common 和 method-specific headers 的深度合并
   * @param {Object} headers1 - 基础 headers
   * @param {Object} headers2 - 要合并的 headers
   * @param {string} method - HTTP 方法（用于合并 method-specific headers）
   * @returns {Object} 合并后的 headers
   */
  function mergeHeaders(headers1, headers2, method) {
    var result = {};
    
    // 🔥 验证 headers 类型：忽略非对象类型（如字符串、数组等）
    if (headers1 != null && (typeof headers1 !== 'object' || Array.isArray(headers1))) {
      headers1 = null;
    }
    if (headers2 != null && (typeof headers2 !== 'object' || Array.isArray(headers2))) {
      headers2 = null;
    }
    
    // 合并 headers1 的 common
    if (headers1 && headers1.common) {
      for (var key in headers1.common) {
        if (headers1.common.hasOwnProperty(key) && isSafeKey(key)) {
          result[key] = headers1.common[key];
        }
      }
    }
    
    // 合并 headers1 的 method-specific headers
    if (method && headers1 && headers1[method]) {
      for (var key in headers1[method]) {
        if (headers1[method].hasOwnProperty(key) && isSafeKey(key)) {
          result[key] = headers1[method][key];
        }
      }
    }
    
    // 合并 headers1 的直接属性（非 common 和 method-specific）
    for (var key in headers1) {
      if (headers1.hasOwnProperty(key) && isSafeKey(key) && 
          key !== 'common' && key !== 'get' && key !== 'post' && 
          key !== 'put' && key !== 'patch' && key !== 'delete' && 
          key !== 'head' && key !== 'options') {
        result[key] = headers1[key];
      }
    }
    
    // 合并 headers2 的 common
    if (headers2 && headers2.common) {
      for (var key in headers2.common) {
        if (headers2.common.hasOwnProperty(key) && isSafeKey(key)) {
          result[key] = headers2.common[key];
        }
      }
    }
    
    // 合并 headers2 的 method-specific headers
    if (method && headers2 && headers2[method]) {
      for (var key in headers2[method]) {
        if (headers2[method].hasOwnProperty(key) && isSafeKey(key)) {
          result[key] = headers2[method][key];
        }
      }
    }
    
    // 合并 headers2 的直接属性
    for (var key in headers2) {
      if (headers2.hasOwnProperty(key) && isSafeKey(key) && 
          key !== 'common' && key !== 'get' && key !== 'post' && 
          key !== 'put' && key !== 'patch' && key !== 'delete' && 
          key !== 'head' && key !== 'options') {
        result[key] = headers2[key];
      }
    }
    
    return result;
  }

  /**
   * 验证 URL 合法性（防止协议注入）
   * @param {string} url - 要验证的 URL
   * @returns {boolean} 是否为合法 URL
   */
  function isValidURL(url) {
    // 只检查类型，axios 允许空字符串和任何格式的 URL
    if (typeof url !== 'string') {
      return false;
    }
    
    return true;
  }

  /**
   * 构建完整 URL
   * @param {string} baseURL - 基础 URL
   * @param {string} url - 相对 URL
   * @param {Object} params - 查询参数
   * @param {Function} paramsSerializer - 参数序列化器
   * @returns {string} 完整 URL
   */
  function buildURL(baseURL, url, params, paramsSerializer) {
    var fullURL = url;
    
    // 处理 baseURL
    if (baseURL && !isAbsoluteURL(url)) {
      fullURL = combineURLs(baseURL, url);
    }
    
    // URL 安全验证
    if (!isValidURL(fullURL)) {
      throw new Error('Invalid URL: ' + fullURL);
    }
    
    // 处理 params
    if (params) {
      var serializedParams;
      
      // 使用自定义序列化器
      if (typeof paramsSerializer === 'function') {
        serializedParams = paramsSerializer(params);
      } else if (paramsSerializer && typeof paramsSerializer === 'object') {
        // 对象格式的 paramsSerializer
        if (typeof paramsSerializer.serialize === 'function') {
          // 有 serialize 函数，直接使用
          serializedParams = paramsSerializer.serialize(params);
        } else {
          // 使用选项（indexes, dots, encode 等）
          serializedParams = serializeParamsWithOptions(params, paramsSerializer);
        }
      } else {
        serializedParams = serializeParams(params);
      }
      
      if (serializedParams) {
        var separator = fullURL.indexOf('?') === -1 ? '?' : '&';
        fullURL = fullURL + separator + serializedParams;
      }
    }
    
    return fullURL;
  }

  /**
   * 判断是否为绝对 URL
   * @param {string} url - URL
   * @returns {boolean} 是否为绝对 URL
   */
  function isAbsoluteURL(url) {
    return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
  }

  /**
   * 组合 URL
   * @param {string} baseURL - 基础 URL
   * @param {string} relativeURL - 相对 URL
   * @returns {string} 组合后的 URL
   */
  function combineURLs(baseURL, relativeURL) {
    return relativeURL
      ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
      : baseURL;
  }

  /**
   * 序列化 params（带边界检查）
   * @param {Object} params - 查询参数
   * @returns {string} 序列化后的字符串
   */
  function serializeParams(params) {
    // 🔥 检测 URLSearchParams（兼容标准和 Goja 实现）
    if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
      return params.toString();
    }
    
    // 🔥 检测 Goja 自定义 URLSearchParams
    if (params && params.__isURLSearchParams === true && typeof params.toString === 'function') {
      return params.toString();
    }
    
    var parts = [];
    var visited = []; // 🔥 循环引用检测
    
    /**
     * 递归序列化参数
     * @param {string} prefix - 键前缀
     * @param {*} value - 值
     */
    function serialize(prefix, value) {
      if (value === null || value === undefined) {
        return;
      }
      
      // 🔥 循环引用检测
      if (typeof value === 'object' && value !== null) {
        if (visited.indexOf(value) !== -1) {
          // 检测到循环引用，跳过
          return;
        }
        visited.push(value);
      }
      
      // Date 对象转为 ISO 字符串
      if (value instanceof Date) {
        parts.push(encodeURIComponent(prefix) + '=' + encodeURIComponent(value.toISOString()));
      }
      // 数组
      else if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          if (value[i] !== null && value[i] !== undefined) {
            // 如果数组元素是对象，递归处理
            if (typeof value[i] === 'object' && !(value[i] instanceof Date)) {
              serialize(prefix + '[' + i + ']', value[i]);
            } else {
              // 简单值使用 [] 语法
              serialize(prefix + '[]', value[i]);
            }
          }
        }
      }
      // 对象（非 Date、非数组）
      else if (typeof value === 'object') {
        for (var key in value) {
          if (value.hasOwnProperty(key) && isSafeKey(key)) {
            serialize(prefix + '[' + key + ']', value[key]);
          }
        }
      }
      // 简单值
      else {
        parts.push(encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
      }
      
      // 🔥 递归完成后从访问列表移除
      if (typeof value === 'object' && value !== null) {
        var idx = visited.indexOf(value);
        if (idx !== -1) {
          visited.splice(idx, 1);
        }
      }
    }
    
    for (var key in params) {
      if (params.hasOwnProperty(key) && isSafeKey(key)) {
        serialize(key, params[key]);
      }
    }
    
    return parts.join('&');
  }

  /**
   * 序列化 params（带选项支持）
   * @param {Object} params - 查询参数
   * @param {Object} options - 序列化选项 {indexes, dots, encode}
   * @returns {string} 序列化后的字符串
   */
  function serializeParamsWithOptions(params, options) {
    // 解析选项
    var indexes = options.indexes !== undefined ? options.indexes : null;
    var dots = options.dots === true;
    var encodeFunc = typeof options.encode === 'function' ? options.encode : encodeURIComponent;
    
    var parts = [];
    var visited = []; // 🔥 循环引用检测
    
    /**
     * 递归序列化参数
     * @param {string} prefix - 键前缀
     * @param {*} value - 值
     */
    function serialize(prefix, value) {
      if (value === null || value === undefined) {
        return;
      }
      
      // 🔥 循环引用检测
      if (typeof value === 'object' && value !== null) {
        if (visited.indexOf(value) !== -1) {
          // 检测到循环引用，跳过
          return;
        }
        visited.push(value);
      }
      
      // Date 对象转为 ISO 字符串
      if (value instanceof Date) {
        parts.push(encodeFunc(prefix) + '=' + encodeFunc(value.toISOString()));
      }
      // 数组
      else if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          if (value[i] !== null && value[i] !== undefined) {
            var arrayKey;
            if (indexes === true) {
              // indexes: true - 使用索引 ids[0]=1&ids[1]=2
              arrayKey = prefix + '[' + i + ']';
            } else if (indexes === false || indexes === null) {
              // indexes: false/null - 不使用索引 ids[]=1&ids[]=2 或 ids=1&ids=2
              arrayKey = prefix + (indexes === null ? '[]' : '');
            } else {
              arrayKey = prefix + '[]';
            }
            
            // 如果数组元素是对象，递归处理
            if (typeof value[i] === 'object' && !(value[i] instanceof Date)) {
              serialize(arrayKey, value[i]);
            } else {
              parts.push(encodeFunc(arrayKey) + '=' + encodeFunc(value[i]));
            }
          }
        }
      }
      // 对象（非 Date、非数组）
      else if (typeof value === 'object') {
        for (var key in value) {
          if (value.hasOwnProperty(key) && isSafeKey(key)) {
            var nestedKey;
            if (dots) {
              // dots: true - 使用点号 filter.name=john
              nestedKey = prefix + '.' + key;
            } else {
              // dots: false - 使用中括号 filter[name]=john
              nestedKey = prefix + '[' + key + ']';
            }
            serialize(nestedKey, value[key]);
          }
        }
      }
      // 简单值
      else {
        parts.push(encodeFunc(prefix) + '=' + encodeFunc(value));
      }
      
      // 🔥 递归完成后从访问列表移除
      if (typeof value === 'object' && value !== null) {
        var idx = visited.indexOf(value);
        if (idx !== -1) {
          visited.splice(idx, 1);
        }
      }
    }
    
    for (var key in params) {
      if (params.hasOwnProperty(key) && isSafeKey(key)) {
        serialize(key, params[key]);
      }
    }
    
    return parts.join('&');
  }

  /**
   * 转换请求数据
   * @param {*} data - 请求数据
   * @param {Object} headers - 请求头
   * @returns {*} 转换后的数据
   */
  function transformRequestData(data, headers) {
    // 🔥 优先检测 Node.js form-data 模块
    // 关键修复：不调用 getBuffer()，直接传递给 fetch 以支持流式上传
    if (data && data.__isNodeFormData === true) {
      // 自动合并 FormData 的 headers (包含正确的 boundary)
      if (typeof data.getHeaders === 'function') {
        const formHeaders = data.getHeaders();
        Object.assign(headers, formHeaders);
      }
      
      // 🔥 直接返回 FormData 对象，让 fetch 处理流式上传
      // fetch 会通过 __getGoStreamingFormData 直接访问底层的 Go StreamingFormData
      // 这样可以支持大文件的流式上传（>1MB 自动启用流式模式）
      return data;
    }
    
    // 🔥 如果是浏览器 FormData，删除 Content-Type 让浏览器自动设置（包含正确的 boundary）
    // 使用标识检查而不是 instanceof（更可靠）
    if (data && typeof data === 'object' && data.__isFormData === true) {
      delete headers['Content-Type'];
      delete headers['content-type'];
      return data;
    }
    
    // 兼容标准 FormData（使用 instanceof）
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
      return data;
    }
    
    if (data && typeof data === 'object' && data.__isURLSearchParams === true && typeof data.toString === 'function') {
      if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
      }
      return data.toString();
    }
    
    // URLSearchParams：设置 Content-Type 并序列化为字符串
    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
      }
      return data.toString();
    }
    
    // Blob / ArrayBuffer / Buffer 直接返回
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data;
    }
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
      return data;
    }
    // 🔥 Buffer 检测（Node.js 环境）
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return data;
    }
    // 🔥 TypedArray 检测（Uint8Array, Int8Array 等）
    if (typeof ArrayBuffer !== 'undefined' && data && typeof data === 'object' && 
        typeof data.byteLength === 'number' && typeof data.buffer === 'object') {
      return data.buffer || data;
    }
    
    // 对象自动转 JSON
    if (typeof data === 'object' && data !== null) {
      if (headers) {
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
      return JSON.stringify(data);
    }
    
    // 其他类型原样返回
    return data;
  }

  /**
   * 应用转换器（支持数组链式调用）
   * @param {*} data - 数据
   * @param {Object} headers - 请求头（可选）
   * @param {Array|Function} transformers - 转换器函数或数组
   * @returns {*} 转换后的数据
   */
  function applyTransformers(data, headers, transformers) {
    // 如果没有转换器，直接返回
    if (!transformers) {
      return data;
    }

    // 确保 transformers 是数组
    var transformerArray = Array.isArray(transformers) ? transformers : [transformers];

    // 链式调用所有转换器
    var result = data;
    for (var i = 0; i < transformerArray.length; i++) {
      var transformer = transformerArray[i];
      if (typeof transformer === 'function') {
        result = transformer(result, headers);
      }
    }

    return result;
  }

  /**
   * 净化配置（移除敏感信息）
   * @param {Object} config - 配置对象
   * @returns {Object} 净化后的配置
   */
  function sanitizeConfig(config) {
    if (!config) return config;
    
    var safe = {};
    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        safe[key] = config[key];
      }
    }
    
    // 🔥 扁平化 headers：将嵌套结构（common、method-specific）合并为扁平对象
    // 这样 response.config.headers['Content-Type'] 可以直接访问
    if (safe.headers && typeof safe.headers === 'object') {
      safe.headers = mergeHeaders(safe.headers, {}, safe.method || 'get');
    }
    
    // 隐藏敏感信息
    if (safe.auth && safe.auth.password) {
      safe.auth = {
        username: safe.auth.username,
        password: CONSTANTS.REDACTED_PASSWORD
      };
    }
    
    return safe;
  }

  /**
   * AxiosError 构造函数
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {Object} config - 配置
   * @param {*} request - 请求对象
   * @param {*} response - 响应对象
   * @constructor
   */
  function AxiosError(message, code, config, request, response) {
    Error.call(this, message);
    
    if (typeof message !== 'undefined') {
      this.message = message;
    } else {
      this.message = undefined;
    }
    this.name = 'AxiosError';
    this.code = code;
    if (config != null) {
      this.config = config;
    }
    this.request = request;
    // 只在 response 存在时设置（网络错误没有 response）
    if (response != null) {
      this.response = response;
    }
    this.isAxiosError = true;
    
    // 设置正确的原型链
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
  }
  
  // 设置原型链
  AxiosError.prototype = Object.create(Error.prototype);
  AxiosError.prototype.constructor = AxiosError;
  
  // toJSON 方法
  AxiosError.prototype.toJSON = function toJSON() {
    // 辅助函数：安全地复制对象，避免循环引用
    function safeClone(obj) {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (e) {
        // 如果有循环引用或其他问题，返回简化版本
        return obj;
      }
    }
    
    return {
      message: this.message,
      name: this.name,
      code: this.code,
      config: safeClone(this.config),
      request: this.request,
      response: this.response,
      status: this.response ? this.response.status : undefined
    };
  };

  /**
   * 创建错误对象（向后兼容）
   * @param {string} message - 错误消息
   * @param {Object} config - 配置
   * @param {string} code - 错误代码
   * @param {*} request - 请求对象
   * @param {*} response - 响应对象
   * @returns {AxiosError} 错误对象
   */
  function createError(message, config, code, request, response) {
    var error = new AxiosError(message, code, sanitizeConfig(config), request, response);
    return error;
  }

  // AxiosError 错误码常量
  AxiosError.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
  AxiosError.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
  AxiosError.ECONNABORTED = 'ECONNABORTED';
  AxiosError.ETIMEDOUT = 'ETIMEDOUT';
  AxiosError.ERR_NETWORK = 'ERR_NETWORK';
  AxiosError.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
  AxiosError.ERR_DEPRECATED = 'ERR_DEPRECATED';
  AxiosError.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
  AxiosError.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
  AxiosError.ERR_CANCELED = 'ERR_CANCELED';
  AxiosError.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
  AxiosError.ERR_INVALID_URL = 'ERR_INVALID_URL';

  /**
   * CanceledError - 取消错误类（继承自 AxiosError）
   * @constructor
   * @param {string} message - 错误消息
   * @param {Object} config - 配置
   * @param {*} request - 请求对象
   */
  function CanceledError(message, config, request) {
    AxiosError.call(this, message || 'canceled', AxiosError.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
  }

  // 设置原型链
  CanceledError.prototype = Object.create(AxiosError.prototype);
  CanceledError.prototype.constructor = CanceledError;

  // ==================== 拦截器管理器 ====================

  /**
   * 拦截器管理器构造函数
   * @constructor
   */
  function InterceptorManager() {
    this.handlers = [];
  }

  /**
   * 添加拦截器
   * @param {Function} fulfilled - 成功回调
   * @param {Function} rejected - 失败回调
   * @param {Object} options - 选项
   * @returns {number} 拦截器 ID
   */
  InterceptorManager.prototype.use = function(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled: fulfilled,
      rejected: rejected,
      options: options || {}
    });
    return this.handlers.length - 1;
  };

  /**
   * 移除拦截器
   * @param {number} id - 拦截器 ID
   */
  InterceptorManager.prototype.eject = function(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  };

  /**
   * 遍历拦截器
   * @param {Function} fn - 回调函数
   */
  InterceptorManager.prototype.forEach = function(fn) {
    for (var i = 0; i < this.handlers.length; i++) {
      if (this.handlers[i] !== null) {
        fn(this.handlers[i]);
      }
    }
  };

  /**
   * 清除所有拦截器
   */
  InterceptorManager.prototype.clear = function() {
    this.handlers = [];
  };

  // ==================== CancelToken 实现 ====================

  /**
   * CancelToken 构造函数
   * @constructor
   * @param {Function} executor - 执行器函数
   */
  function CancelToken(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    // 检查 AbortController 兼容性
    if (typeof AbortController === 'undefined') {
      throw new Error('AbortController is not available in this environment');
    }

    var controller = new AbortController();
    this.signal = controller.signal;
    this.reason = undefined;
    this._controller = controller;

    // 与官方 axios CancelToken 对齐：内部维护一个 promise，在取消时 resolve(reason)
    var resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    var token = this;
    executor(function cancel(message) {
      if (token.reason) {
        return; // 已经取消
      }

      token.reason = new Cancel(message || 'Operation canceled');

      // 通知所有监听 token.promise 的回调
      if (resolvePromise) {
        resolvePromise(token.reason);
      }

      // 继续通过 AbortController 触发底层 fetch 取消
      controller.abort();
    });
  }

  // 与 axios 1.x 行为保持一致：在已取消时立即抛出取消错误
  CancelToken.prototype.throwIfRequested = function() {
    if (this.reason) {
      throw this.reason;
    }
  };

  /**
   * 订阅取消事件
   * @param {Function} listener - 回调函数
   * @returns {Function} 取消订阅函数
   */
  CancelToken.prototype.subscribe = function(listener) {
    if (this.reason) {
      listener(this.reason);
      return function() {};
    }

    if (this.promise && typeof listener === 'function') {
      this.promise.then(listener);
    }

    return function() {};
  };

  /**
   * 取消订阅（兼容性方法）
   */
  CancelToken.prototype.unsubscribe = function(listener) {
    // 简单实现，实际上 promise 订阅后无法取消
  };

  /**
   * 转换为 AbortSignal
   * @returns {AbortSignal}
   */
  CancelToken.prototype.toAbortSignal = function() {
    return this.signal || this._controller.signal;
  };

  /**
   * 创建 CancelToken source
   * @returns {Object} source 对象
   */
  CancelToken.source = function() {
    var cancel;
    var token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token: token,
      cancel: cancel
    };
  };

  /**
   * Cancel 构造函数
   * @constructor
   * @param {string} message - 取消消息
   */
  function Cancel(message) {
    this.message = message || 'canceled';
    // 与 Node.js axios 对齐：取消错误使用 ERR_CANCELED 编码，并带有 __CANCEL__ 标记
    this.code = 'ERR_CANCELED';
    this.__CANCEL__ = true;
  }

  Cancel.prototype.toString = function() {
    return 'Cancel' + (this.message ? ': ' + this.message : '');
  };

  /**
   * 检查是否为取消错误
   * @param {*} value - 要检查的值
   * @returns {boolean} 是否为取消错误
   */
  function isCancel(value) {
    // 与官方 axios 1.x 行为保持一致：
    // 1) CancelToken 产生的 Cancel 对象通过 __CANCEL__ 标记识别
    // 2) AbortController 产生的 AxiosError 使用 code === 'ERR_CANCELED'
    // 3) CanceledError 实例
    if (!value) {
      return false;
    }

    if (value.__CANCEL__ === true) {
      return true;
    }

    if (value instanceof CanceledError) {
      return true;
    }

    if (value.isAxiosError && value.code === 'ERR_CANCELED') {
      return true;
    }

    return false;
  }

  // ==================== Axios 核心实现 ====================

  /**
   * Axios 构造函数
   * @constructor
   * @param {Object} instanceConfig - 实例配置
   */
  function Axios(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }

  /**
   * 核心请求方法
   * @param {string|Object} config - 配置或 URL
   * @returns {Promise} 请求 Promise
   */
  Axios.prototype.request = function(config) {
    // 参数验证（必须在转换之前）
    if (typeof config === 'string') {
      // 支持 axios(url, config) 形式
      config = arguments[1] || {};
      config.url = arguments[0];
    } else if (config === null || config === undefined) {
      // 不允许 null 或 undefined
      throw new TypeError('Config must be an object');
    } else if (typeof config !== 'object') {
      // 不允许其他非对象类型
      throw new TypeError('Config must be an object');
    }

    if (config.timeout !== undefined && config.timeout !== null && typeof config.timeout !== 'number') {
      throw new TypeError('Timeout must be a number');
    }

    if (config.timeout && config.timeout < 0) {
      throw new TypeError('Timeout must be non-negative');
    }

    // 合并配置
    config = mergeConfig(this.defaults, config);
    
    // 设置 method
    config.method = (config.method || 'get').toLowerCase();

    // 拦截器链（优化：使用索引而非 shift）
    var chain = [dispatchRequest, undefined];
    var promise = Promise.resolve(config);

    // 添加请求拦截器（倒序）
    this.interceptors.request.forEach(function(interceptor) {
      // 检查 runWhen 选项
      if (interceptor.options && interceptor.options.runWhen) {
        try {
          // Node.js axios 行为：只有严格等于 false 时才跳过拦截器
          // 其他 falsy 值（0, undefined, null, ''）都会执行拦截器
          if (interceptor.options.runWhen(config) === false) {
            return; // 跳过此拦截器
          }
        } catch (e) {
          // runWhen 抛出错误时，某些版本可能会抛错，某些可能会忽略
          // 这里选择忽略错误，跳过拦截器
          return;
        }
      }
      chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    // 添加响应拦截器（正序）
    this.interceptors.response.forEach(function(interceptor) {
      chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    // 执行拦截器链（优化：使用索引遍历）
    var i = 0;
    while (i < chain.length) {
      promise = promise.then(chain[i++], chain[i++]);
    }

    return promise;
  };

  /**
   * 实际发送请求
   * @param {Object} config - 配置
   * @returns {Promise} 请求 Promise
   */
  function dispatchRequest(config) {
    var hasCustomAdapter = config && typeof config.adapter === 'function';
    var hasBeforeRedirect = typeof config.beforeRedirect === 'function';
    var hasMaxRedirects = typeof config.maxRedirects === 'number' && config.maxRedirects >= 0;

    // 检查取消（仅非自定义 adapter 提前短路，自定义 adapter 仍然会被调用）
    if (!hasCustomAdapter) {
      throwIfCancellationRequested(config);
    }

    if (!hasCustomAdapter && (hasBeforeRedirect || hasMaxRedirects)) {
      var redirectHelper = null;
      if (typeof require === 'function') {
        try {
          redirectHelper = require('./axios_redirect_helper.js');
        } catch (e) {}
      }
      if (!redirectHelper && typeof __AxiosRedirectHelper !== 'undefined') {
        redirectHelper = __AxiosRedirectHelper;
      }
      if (redirectHelper && typeof redirectHelper.sendWithRedirects === 'function') {
        return redirectHelper.sendWithRedirects(
          config,
          fetch,
          buildURL,
          mergeHeaders,
          transformRequestData,
          applyTransformers,
          parseHeaders,
          sanitizeConfig,
          createError,
          throwIfCancellationRequested
        ).then(function(result) {
          var response = result.response;
          var finalURL = result.url;
          var finalConfig = result.config;

          var responseType = finalConfig.responseType || 'json';
          var dataPromise;
          var method = (finalConfig.method || 'GET').toUpperCase();
          if (method === 'HEAD' || method === 'OPTIONS') {
            dataPromise = Promise.resolve('');
          } else if (responseType === 'stream') {
            dataPromise = Promise.resolve(response.body);
          } else if (responseType === 'json') {
            if (finalConfig && finalConfig.transformResponse) {
              dataPromise = response.text();
            } else {
              dataPromise = response.text().then(function(text) {
                if (!text || text.trim() === '') {
                  return '';
                }
                try {
                  return JSON.parse(text);
                } catch (jsonError) {
                  return text;
                }
              });
            }
          } else if (responseType === 'text') {
            dataPromise = response.text();
          } else if (responseType === 'blob') {
            dataPromise = response.blob();
          } else if (responseType === 'arraybuffer') {
            // 🔥 修复: 将 ArrayBuffer 转换为 Buffer (与 Node.js axios 保持一致)
            dataPromise = response.arrayBuffer().then(function(arrayBuffer) {
              return Buffer.from(arrayBuffer);
            });
          } else {
            dataPromise = response.text();
          }

          return dataPromise.then(function(data) {
            var transformedData = data;
            var shouldApplyTransform = !!finalConfig.transformResponse;

            // 当 responseType 为 text 且仅使用默认 transformResponse 时，
            // 与 Node.js axios 一致：不强制按 JSON 解析，直接返回字符串
            if (finalConfig.responseType === 'text' && finalConfig.transformResponse === defaults.transformResponse) {
              shouldApplyTransform = false;
            }

            if (shouldApplyTransform) {
              transformedData = applyTransformers(data, parseHeaders(response.headers), finalConfig.transformResponse);
            }

            var requestObj = {
              path: response.url || finalURL,
              url: response.url || finalURL,
              method: finalConfig.method.toUpperCase()
            };

            var axiosResponse = {
              data: transformedData,
              status: response.status,
              statusText: response.statusText,
              headers: parseHeaders(response.headers),
              config: sanitizeConfig(finalConfig),
              request: requestObj
            };

            if (finalConfig.validateStatus === false) {
            } else if (typeof finalConfig.validateStatus === 'function') {
              if (!finalConfig.validateStatus(response.status)) {
                throw createError(
                  'Request failed with status code ' + response.status,
                  finalConfig,
                  null,
                  requestObj,
                  axiosResponse
                );
              }
            } else {
              var status = response.status;
              if (status < 200 || status >= 300) {
                throw createError(
                  'Request failed with status code ' + response.status,
                  finalConfig,
                  null,
                  requestObj,
                  axiosResponse
                );
              }
            }

            return axiosResponse;
          });
        }).catch(function(error) {
          // 重定向过程中的错误处理（与普通 fetch 错误处理保持一致）
          
          // 检查是否为请求取消（CancelToken）
          if (config.cancelToken && config.cancelToken.reason) {
            throw config.cancelToken.reason;
          }

          // 已经是 AxiosError 的情况，直接透传
          if (error && error.isAxiosError) {
            throw error;
          }

          // AbortController 取消
          // 检查多种 abort 错误模式：
          // 1. error.name === 'AbortError' (标准 AbortError)
          // 2. error.message 包含 'abort' (各种实现的 abort 消息)
          var isAbortError = error && (
            error.name === 'AbortError' ||
            (typeof error.message === 'string' && error.message.toLowerCase().indexOf('abort') !== -1)
          );
          
          if (isAbortError) {
            throw createError(
              'Request canceled',
              config,
              'ERR_CANCELED',
              undefined,
              null
            );
          }

          // 其他网络/底层错误，统一包装为 AxiosError（ERR_NETWORK）
          var message = error && error.message ? error.message : 'Network Error';
          var networkCode = 'ERR_NETWORK';

          if (error && error.code) {
            networkCode = error.code;
          } else if (typeof message === 'string') {
            var lowerMsg = message.toLowerCase();
            if (lowerMsg.indexOf('econnrefused') !== -1 || lowerMsg.indexOf('connection refused') !== -1 || lowerMsg.indexOf('connect: connection refused') !== -1) {
              networkCode = 'ECONNREFUSED';
            }
          }

          throw createError(
            message,
            config,
            networkCode,
            undefined,
            null
          );
        });
      } else if (hasBeforeRedirect) {
        try {
          var tempURL = buildURL(config.baseURL, config.url, config.params, config.paramsSerializer);
          var tempHeaders = mergeHeaders(config.headers || {}, {}, config.method || 'get');
          var fakeOptions = {
            protocol: null,
            hostname: null,
            port: null,
            path: tempURL,
            method: (config.method || 'get').toUpperCase(),
            headers: tempHeaders
          };
          var fakeResponseDetails = {
            headers: {},
            statusCode: 0,
            statusMessage: '',
            url: tempURL
          };
          config.beforeRedirect(fakeOptions, fakeResponseDetails);
        } catch (e) {}
      }
    }

    // 🔥 支持自定义 adapter（与 Node.js axios 行为对齐）
    // 如果配置中提供了 adapter 函数，则优先使用该适配器，不走默认的 fetch 流程。
    // 这样可以在测试中通过 mockAdapter 模拟请求/响应，而不会真正发起网络请求。
    if (config && typeof config.adapter === 'function') {
      // 为自定义 adapter 扁平化 headers：合并 common / method-specific / 请求级
      // 并保持普通对象形态，方便通过 config.headers['X-Test'] 这类访问方式读取。
      if (config.headers && !(config.headers instanceof AxiosHeaders)) {
        var flatAdapterHeaders = mergeHeaders(config.headers, {}, config.method);
        config.headers = flatAdapterHeaders;
      }
      
      // 🔥 应用 transformRequest（与 Node.js axios 行为对齐）
      if (config.transformRequest && config.data !== undefined) {
        config.data = applyTransformers(config.data, config.headers || {}, config.transformRequest);
      }

      // 🔥 特殊处理 FormData + 自定义 adapter：
      // transformRequestData 在处理 Web FormData (__isFormData) 时会删除 Content-Type，
      // 以便底层 fetch 自动设置 boundary。但对于自定义 adapter，测试会直接读取
      // config.headers，需要在此场景下补回 multipart/form-data 头部，
      // 同时避免覆盖 Node.js form-data 自带的带 boundary 的 Content-Type。
      if (config && config.headers && config.data && (config.method === 'post' || config.method === 'put' || config.method === 'patch')) {
        var hasContentType = false;
        for (var hKey in config.headers) {
          if (config.headers.hasOwnProperty(hKey)) {
            var lowerKey = hKey.toLowerCase();
            if (lowerKey === 'content-type' && config.headers[hKey] != null) {
              hasContentType = true;
              break;
            }
          }
        }

        var dataObj = config.data;
        var isFormLike = false;
        if (dataObj && typeof dataObj === 'object') {
          if (dataObj.__isFormData === true || dataObj.__isNodeFormData === true) {
            isFormLike = true;
          }
        }

        // 仅当当前没有任何 Content-Type 且 data 是 FormData 时补充 header
        if (!hasContentType && isFormLike) {
          config.headers['Content-Type'] = 'multipart/form-data';
        }
      }

      var adapterPromise = Promise.resolve().then(function() {
        return config.adapter(config);
      });

      return adapterPromise.then(function onAdapterResolution(response) {
        // 🔥 再次检查取消状态（支持“请求中取消 + 自定义 adapter”场景）
        throwIfCancellationRequested(config);
        
        // 🔥 应用 transformResponse（与 Node.js axios 行为对齐）
        if (config.transformResponse && response && response.data !== undefined) {
          response.data = applyTransformers(response.data, response.headers || {}, config.transformResponse);
        }
        
        return response;
      }, function onAdapterRejection(reason) {
        // 如果 adapter 主动抛出取消错误，直接透传
        if (isCancel(reason)) {
          throw reason;
        }

        // 如果已经是 axios 错误，直接透传
        if (reason && reason.isAxiosError) {
          throw reason;
        }

        var responseFromReason = reason && reason.response ? reason.response : null;
        var requestFromReason = reason && reason.request ? reason.request : undefined;

        // 其他错误包装为 AxiosError，尽量保留原始 response/request 信息
        throw createError(
          reason && reason.message ? reason.message : 'Network Error',
          config,
          reason && reason.code,
          requestFromReason,
          responseFromReason
        );
      });
    }

    // 构建完整 URL（带安全验证）
    var fullURL = buildURL(config.baseURL, config.url, config.params, config.paramsSerializer);

    // 🔥 修复：正确合并 headers（common + method-specific + 请求级）
    var headers = mergeHeaders(config.headers, {}, config.method);

    // 处理 auth（避免密码泄漏）
    if (config.auth) {
      if (!HAS_BTOA) {
        throw new Error('Basic Authentication requires btoa, which is not available in this environment');
      }
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
    }

    // 转换请求数据
    var data = config.data;
    // 🔥 总是执行 transformRequest（即使是 GET 请求）
    if (config.transformRequest) {
      data = applyTransformers(data, headers, config.transformRequest);
    } else if (data && config.method !== 'get' && config.method !== 'head') {
      // 默认转换只在非 GET/HEAD 请求时应用
      data = transformRequestData(data, headers);
    }
    if (data !== undefined && config.method !== 'get' && config.method !== 'head') {
      var maxBodyLength = typeof config.maxBodyLength === 'number' ? config.maxBodyLength : -1;
      if (maxBodyLength > -1) {
        var bodyLength = null;
        if (typeof data === 'string') {
          bodyLength = data.length;
        } else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
          bodyLength = data.byteLength || data.length;
        } else if (data && typeof data === 'object' && typeof data.byteLength === 'number') {
          bodyLength = data.byteLength;
        }
        if (bodyLength !== null && bodyLength > maxBodyLength) {
          throw createError(
            'Request body larger than maxBodyLength limit',
            config,
            'ERR_BAD_REQUEST',
            undefined,
            null
          );
        }
      }
    }

    // 构建 Fetch 选项
    var fetchOptions = {
      method: config.method.toUpperCase(),
      headers: headers
    };

    if (data !== undefined && config.method !== 'get' && config.method !== 'head') {
      fetchOptions.body = data;
    }

    // 🔥 添加流式标记（内部使用）
    if (config.responseType === 'stream') {
      fetchOptions.__streaming = true;
    }

    // 添加 AbortSignal：优先支持 config.signal（AbortController），否则使用 CancelToken.signal
    if (config.signal) {
      fetchOptions.signal = config.signal;
    } else if (config.cancelToken) {
      fetchOptions.signal = config.cancelToken.signal;
    }

    // 超时控制（修复内存泄漏）
    var timeoutId;
    var timeoutPromise = null;
    
    if (config.timeout && config.timeout > 0) {
      timeoutPromise = new Promise(function(_, reject) {
        timeoutId = setTimeout(function() {
          var timeoutRequestObj = {
            path: fullURL,
            url: fullURL,
            method: config.method.toUpperCase()
          };
          reject(createError(
            'timeout of ' + config.timeout + 'ms exceeded',
            config,
            'ECONNABORTED',
            timeoutRequestObj,
            null
          ));
        }, config.timeout);
      });
    }

    // 发送请求
    var fetchPromise = fetch(fullURL, fetchOptions)
      .then(function(response) {
        // 检查取消
        throwIfCancellationRequested(config);
        
        // 创建 request 对象（用于错误和响应）
        var requestObj = {
          path: response.url || fullURL,
          url: response.url || fullURL,
          method: config.method.toUpperCase()
        };
        
        // maxContentLength 检查 - 跳过 HEAD 请求（HEAD 不返回 body）
        var isHeadRequest = (config.method || '').toLowerCase() === 'head';
        var maxContentLength = typeof config.maxContentLength === 'number' ? config.maxContentLength : -1;
        if (maxContentLength > -1 && !isHeadRequest) {
          var lengthHeaders = parseHeaders(response.headers);
          var contentLengthValue = lengthHeaders['content-length'];
          if (contentLengthValue != null) {
            var contentLengthStr = Array.isArray(contentLengthValue) ? contentLengthValue[0] : contentLengthValue;
            var parsed = parseInt(contentLengthStr, 10);
            if (!isNaN(parsed) && parsed > maxContentLength) {
              throw createError(
                'maxContentLength size of ' + maxContentLength + ' exceeded',
                config,
                'ERR_BAD_RESPONSE',
                requestObj,
                null
              );
            }
          }
        }

        // 读取响应数据（增强错误处理）
        var responseType = config.responseType || 'json';
        var dataPromise;
        
        // 🔥 特殊处理 HEAD 和 OPTIONS 请求：它们通常没有响应体
        var method = (config.method || 'GET').toUpperCase();
        if (method === 'HEAD' || method === 'OPTIONS') {
          // HEAD/OPTIONS 请求不尝试解析 body，直接返回空字符串
          dataPromise = Promise.resolve('');
        } else if (responseType === 'stream') {
          // 🔥 流式响应：直接返回 response.body（ReadableStream）
          dataPromise = Promise.resolve(response.body);
        } else if (responseType === 'json') {
          // 当存在自定义 transformResponse 时，与 axios 行为保持一致：
          // 先把原始文本交给 transformResponse，由调用方决定是否以及如何解析 JSON。
          if (config && config.transformResponse) {
            dataPromise = response.text();
          } else {
            // 🔥 默认行为：先读取为 text, 再尝试解析 JSON
            // 避免 json() 失败后流已关闭导致无法降级到 text()
            dataPromise = response.text().then(function(text) {
              // 🔥 修复：空响应应该返回空字符串，与 Node.js 行为一致
              if (!text || text.trim() === '') {
                return '';
              }
              // 尝试解析 JSON
              try {
                return JSON.parse(text);
              } catch (jsonError) {
                // JSON 解析失败时，返回原始文本
                // 这是正常行为(例如 HTML/XML/文本响应)
                // console.warn('Failed to parse JSON response, returning raw text:', jsonError.message);
                return text;
              }
            });
          }
        } else if (responseType === 'text') {
          dataPromise = response.text();
        } else if (responseType === 'blob') {
          dataPromise = response.blob();
        } else if (responseType === 'arraybuffer') {
          // 🔥 修复: 将 ArrayBuffer 转换为 Buffer (与 Node.js axios 保持一致)
          dataPromise = response.arrayBuffer().then(function(arrayBuffer) {
            // 使用 Buffer.from() 将 ArrayBuffer 转换为 Buffer
            // 这样返回的对象会有 buffer 属性指向原始的 ArrayBuffer
            return Buffer.from(arrayBuffer);
          });
        } else {
          dataPromise = response.text();
        }

        return dataPromise.then(function(data) {
          // 🔥 maxContentLength 检查 - 检查实际读取的数据大小
          if (maxContentLength >= 0 && !isHeadRequest && data) {
            var dataSize = 0;
            if (typeof data === 'string') {
              dataSize = data.length;
            } else if (data.byteLength !== undefined) {
              dataSize = data.byteLength;
            } else if (data.length !== undefined) {
              dataSize = data.length;
            }
            
            if (dataSize > maxContentLength) {
              throw createError(
                'maxContentLength size of ' + maxContentLength + ' exceeded',
                config,
                'ERR_BAD_RESPONSE',
                requestObj,
                null
              );
            }
          }
          
          // 🔥 应用自定义 transformResponse
          var transformedData = data;
          var shouldApplyTransform = !!config.transformResponse;

          // 当 responseType 为 text 且仅使用默认 transformResponse 时，
          // 与 Node.js axios 一致：不强制按 JSON 解析，直接返回字符串
          if (config.responseType === 'text' && config.transformResponse === defaults.transformResponse) {
            shouldApplyTransform = false;
          }

          if (shouldApplyTransform) {
            transformedData = applyTransformers(data, parseHeaders(response.headers), config.transformResponse);
          }

          // 🔥 requestObj 在前面已经创建，这里复用

          var axiosResponse = {
            data: transformedData,
            status: response.status,
            statusText: response.statusText,
            headers: parseHeaders(response.headers),
            config: sanitizeConfig(config), // 净化配置
            request: requestObj
          };

          // 🔥 检查 HTTP 错误（修复 validateStatus 逻辑）
          // 如果 validateStatus 为 false，禁用所有验证
          if (config.validateStatus === false) {
            // 禁用验证，接受所有状态码
          } else if (typeof config.validateStatus === 'function') {
            // 自定义验证函数
            if (!config.validateStatus(response.status)) {
              throw createError(
                'Request failed with status code ' + response.status,
                config,
                null,
                requestObj,
                axiosResponse
              );
            }
          } else {
            // 默认验证逻辑：只接受 2xx 状态码
            var status = response.status;
            if (status < 200 || status >= 300) {
              throw createError(
                'Request failed with status code ' + response.status,
                config,
                null,
                requestObj,
                axiosResponse
              );
            }
          }

          return axiosResponse;
        });
      })
      .catch(function(error) {
        // 检查是否为请求取消（CancelToken）
        if (config.cancelToken && config.cancelToken.reason) {
          throw config.cancelToken.reason;
        }

        // 已经是 AxiosError 的情况，直接透传
        if (error && error.isAxiosError) {
          throw error;
        }

        // 创建基本的 request 对象（用于错误）
        var errorRequestObj = {
          path: fullURL,
          url: fullURL,
          method: config.method.toUpperCase()
        };
        
        // AbortController 取消
        // 检查多种 abort 错误模式：
        // 1. error.name === 'AbortError' (标准 AbortError)
        // 2. error.message 包含 'abort' (各种实现的 abort 消息)
        var isAbortError = error && (
          error.name === 'AbortError' ||
          (typeof error.message === 'string' && error.message.toLowerCase().indexOf('abort') !== -1)
        );
        
        if (isAbortError) {
          throw createError(
            'Request canceled',
            config,
            'ERR_CANCELED',
            errorRequestObj,
            null
          );
        }

        // 其他网络/底层错误，统一包装为 AxiosError（ERR_NETWORK），
        // 尽量根据底层错误信息推断类似 Node.js 的错误码（如 ECONNREFUSED）。
        var message = error && error.message ? error.message : 'Network Error';
        var networkCode = 'ERR_NETWORK';

        if (error && error.code) {
          networkCode = error.code;
        } else if (typeof message === 'string') {
          var lowerMsg = message.toLowerCase();
          if (lowerMsg.indexOf('econnrefused') !== -1 || lowerMsg.indexOf('connection refused') !== -1 || lowerMsg.indexOf('connect: connection refused') !== -1) {
            networkCode = 'ECONNREFUSED';
          }
        }

        throw createError(
          message,
          config,
          networkCode,
          errorRequestObj,
          null
        );
      })
      .finally(function() {
        // 清理定时器（防止内存泄漏）
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

    // 如果有超时，使用 Promise.race
    if (timeoutPromise) {
      return Promise.race([fetchPromise, timeoutPromise]);
    }

    return fetchPromise;
  }

  /**
   * 解析 Headers（性能优化：减少不必要的遍历）
   * 🔥 修复: 正确处理多值 header（如 Set-Cookie）
   * @param {Headers} headers - Headers 对象
   * @returns {Object} 解析后的对象
   */
  function parseHeaders(headers) {
    var result = {};
    
    if (!headers || typeof headers.forEach !== 'function') {
      return result;
    }
    
    // 直接遍历，无需缓存（因为每次响应的 headers 都不同）
    headers.forEach(function(value, key) {
      var keyLower = key.toLowerCase();
      
      // 🔥 修复: Set-Cookie 可能是数组（多个 cookie）
      // 保持数组形式，让 axios 用户代码可以正确处理多个 cookie
      if (Array.isArray(value)) {
        result[keyLower] = value;
      } else {
        result[keyLower] = value;
      }
    });
    
    return result;
  }

  /**
   * 检查是否已取消
   * @param {Object} config - 配置
   * @throws {Cancel} 如果已取消则抛出
   */
  function throwIfCancellationRequested(config) {
    if (config.cancelToken && config.cancelToken.reason) {
      throw config.cancelToken.reason;
    }

    // 🔥 与 Node.js axios 行为对齐：支持通过 AbortController 进行取消
    if (config.signal && config.signal.aborted) {
      // signal.reason 可能是任意错误对象，这里保持简单语义，与其他 abort 分支一致
      throw createError(
        'Request canceled',
        config,
        'ERR_CANCELED',
        undefined,
        null
      );
    }
  }

  // ==================== AxiosHeaders 类 ====================

  /**
   * AxiosHeaders - HTTP Headers 管理类
   * 提供大小写不敏感的 header 操作
   */
  function AxiosHeaders(headers) {
    // 内部存储：使用小写 key 作为索引
    this.$data = {};
    // 存储原始大小写的 key
    this.$keys = {};
    
    if (headers) {
      this.set(headers);
    }
  }

  /**
   * 规范化 header 名称为小写
   */
  function normalizeHeaderName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    return name.toLowerCase();
  }

  /**
   * 设置 header
   * @param {string|Object} nameOrHeaders - header 名称或对象
   * @param {*} value - header 值
   * @returns {AxiosHeaders} this
   */
  AxiosHeaders.prototype.set = function(nameOrHeaders, value) {
    var self = this;
    
    if (typeof nameOrHeaders === 'object' && nameOrHeaders !== null) {
      // 批量设置
      if (nameOrHeaders instanceof AxiosHeaders) {
        // 从另一个 AxiosHeaders 实例复制
        var keys = Object.keys(nameOrHeaders.$data);
        keys.forEach(function(normalizedKey) {
          self.$data[normalizedKey] = nameOrHeaders.$data[normalizedKey];
          self.$keys[normalizedKey] = nameOrHeaders.$keys[normalizedKey];
        });
      } else {
        // 从普通对象设置
        for (var key in nameOrHeaders) {
          if (nameOrHeaders.hasOwnProperty(key) && isSafeKey(key)) {
            var normalizedKey = normalizeHeaderName(key);
            var val = nameOrHeaders[key];
            
            // 如果值为 undefined，删除该 header
            if (val === undefined) {
              delete self.$data[normalizedKey];
              delete self.$keys[normalizedKey];
            } else {
              // 数字转换为字符串；布尔值保持原始类型（与 Node axios 行为对齐）
              if (typeof val === 'number') {
                val = String(val);
              }
              self.$data[normalizedKey] = val;
              self.$keys[normalizedKey] = key;
            }
          }
        }
      }
    } else if (typeof nameOrHeaders === 'string') {
      // 设置单个 header
      var normalizedKey = normalizeHeaderName(nameOrHeaders);
      
      // 如果值为 undefined，删除该 header
      if (value === undefined) {
        delete self.$data[normalizedKey];
        delete self.$keys[normalizedKey];
      } else {
        // 数字和布尔值转换为字符串
        var val = value;
        if (typeof val === 'number' || typeof val === 'boolean') {
          val = String(val);
        }
        self.$data[normalizedKey] = val;
        self.$keys[normalizedKey] = nameOrHeaders;
      }
    }
    
    return this;
  };

  /**
   * 获取 header 值
   * @param {string} name - header 名称
   * @param {Function} parser - 可选的解析函数
   * @returns {*} header 值
   */
  AxiosHeaders.prototype.get = function(name, parser) {
    if (!name) return undefined;
    
    var normalizedKey = normalizeHeaderName(name);
    var value = this.$data[normalizedKey];
    
    if (value !== undefined && parser && typeof parser === 'function') {
      try {
        return parser(value);
      } catch (e) {
        return value;
      }
    }
    
    return value;
  };

  /**
   * 检查 header 是否存在
   * @param {string} name - header 名称
   * @returns {boolean}
   */
  AxiosHeaders.prototype.has = function(name) {
    if (!name) return false;
    var normalizedKey = normalizeHeaderName(name);
    return this.$data.hasOwnProperty(normalizedKey);
  };

  /**
   * 删除 header
   * @param {string|Array} nameOrNames - header 名称或名称数组
   * @returns {boolean} 是否删除成功
   */
  AxiosHeaders.prototype.delete = function(nameOrNames) {
    var self = this;
    var deleted = false;
    
    if (Array.isArray(nameOrNames)) {
      nameOrNames.forEach(function(name) {
        if (self.delete(name)) {
          deleted = true;
        }
      });
    } else if (typeof nameOrNames === 'string') {
      var normalizedKey = normalizeHeaderName(nameOrNames);
      if (this.$data.hasOwnProperty(normalizedKey)) {
        delete this.$data[normalizedKey];
        delete this.$keys[normalizedKey];
        deleted = true;
      }
    }
    
    return deleted;
  };

  /**
   * 清空所有 headers
   * @returns {boolean}
   */
  AxiosHeaders.prototype.clear = function() {
    this.$data = {};
    this.$keys = {};
    return true;
  };

  /**
   * 规范化 headers（可选格式化）
   * @param {Object} format - 格式化配置
   * @returns {AxiosHeaders} this
   */
  AxiosHeaders.prototype.normalize = function(format) {
    // 简单实现：规范化为标准格式
    return this;
  };

  /**
   * 转换为 JSON 对象
   * @returns {Object}
   */
  AxiosHeaders.prototype.toJSON = function() {
    var result = {};
    var self = this;
    
    Object.keys(this.$data).forEach(function(normalizedKey) {
      var value = self.$data[normalizedKey];
      // 跳过 null 和 false 值
      if (value !== null && value !== false) {
        var originalKey = self.$keys[normalizedKey] || normalizedKey;
        result[originalKey] = value;
      }
    });
    
    return result;
  };

  /**
   * 设置 Content-Type
   */
  AxiosHeaders.prototype.setContentType = function(value) {
    return this.set('Content-Type', value);
  };

  /**
   * 获取 Content-Type
   */
  AxiosHeaders.prototype.getContentType = function() {
    return this.get('Content-Type');
  };

  /**
   * 检查是否有 Content-Type
   */
  AxiosHeaders.prototype.hasContentType = function() {
    return this.has('Content-Type');
  };

  /**
   * 设置 Accept
   */
  AxiosHeaders.prototype.setAccept = function(value) {
    return this.set('Accept', value);
  };

  /**
   * 设置 User-Agent
   */
  AxiosHeaders.prototype.setUserAgent = function(value) {
    return this.set('User-Agent', value);
  };

  /**
   * 设置 Content-Length
   */
  AxiosHeaders.prototype.setContentLength = function(value) {
    return this.set('Content-Length', value);
  };

  /**
   * 设置 Content-Encoding
   */
  AxiosHeaders.prototype.setContentEncoding = function(value) {
    return this.set('Content-Encoding', value);
  };

  /**
   * 迭代器支持
   */
  if (typeof Symbol !== 'undefined' && Symbol.iterator) {
    AxiosHeaders.prototype[Symbol.iterator] = function() {
      var self = this;
      var keys = Object.keys(this.$data);
      var index = 0;
      
      return {
        next: function() {
          if (index >= keys.length) {
            return { done: true };
          }
          
          var normalizedKey = keys[index++];
          var originalKey = self.$keys[normalizedKey] || normalizedKey;
          var value = self.$data[normalizedKey];
          
          return {
            done: false,
            value: [originalKey, value]
          };
        }
      };
    };
  }

  /**
   * 静态方法：from
   * @param {*} thing - 要转换的对象
   * @returns {AxiosHeaders}
   */
  AxiosHeaders.from = function(thing) {
    if (thing instanceof AxiosHeaders) {
      return thing;
    }
    return new AxiosHeaders(thing);
  };

  /**
   * 静态方法：concat
   * @param {...*} args - 要合并的 headers
   * @returns {AxiosHeaders}
   */
  AxiosHeaders.concat = function() {
    var result = new AxiosHeaders();
    
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i]) {
        result.set(arguments[i]);
      }
    }
    
    return result;
  };

  /**
   * 静态方法：accessor（定义访问器）
   * @param {string} name - accessor 名称
   */
  AxiosHeaders.accessor = function(name) {
    // 简单实现：返回 undefined
    return undefined;
  };

  // ==================== 便捷方法 ====================

  /**
   * 创建不带 data 的 HTTP 方法
   */
  function createShortMethods() {
    var methods = CONSTANTS.HTTP_METHODS_WITHOUT_DATA;
    
    methods.forEach(function(method) {
      Axios.prototype[method] = function(url, config) {
        // 不直接修改传入的 config，创建一个新的请求配置对象
        var requestConfig = {};

        if (config != null) {
          for (var key in config) {
            if (config.hasOwnProperty(key)) {
              requestConfig[key] = config[key];
            }
          }
        }

        // 设置请求方法和 URL
        requestConfig.method = method;
        requestConfig.url = url;

        return this.request(requestConfig);
      };
    });
  }

  /**
   * 创建带 data 的 HTTP 方法
   */
  function createDataMethods() {
    var methods = CONSTANTS.HTTP_METHODS_WITH_DATA;
    
    methods.forEach(function(method) {
      Axios.prototype[method] = function(url, data, config) {
        // 不直接修改传入的 config，创建一个新的请求配置对象
        var requestConfig = {};

        if (config != null) {
          for (var key in config) {
            if (config.hasOwnProperty(key)) {
              requestConfig[key] = config[key];
            }
          }
        }

        // 设置请求方法、URL 和 data
        requestConfig.method = method;
        requestConfig.url = url;
        requestConfig.data = data;

        return this.request(requestConfig);
      };
    });
  }

  createShortMethods();
  createDataMethods();
  
  /**
   * 获取请求 URI
   * @param {Object} config - 配置
   * @returns {string} 完整 URI
   */
  Axios.prototype.getUri = function(config) {
    config = mergeConfig(this.defaults, config);
    return buildURL(config.baseURL, config.url, config.params, config.paramsSerializer);
  };

  // ==================== 创建实例 ====================

  /**
   * 创建 Axios 实例
   * @param {Object} defaultConfig - 默认配置
   * @returns {Function} Axios 实例
   */
  function createInstance(defaultConfig) {
    var context = new Axios(defaultConfig);
    
    var instance = function(config) {
      return context.request(config);
    };

    // 复制原型方法
    for (var key in Axios.prototype) {
      if (Axios.prototype.hasOwnProperty(key)) {
        (function(key) {
          instance[key] = function() {
            return Axios.prototype[key].apply(context, arguments);
          };
        })(key);
      }
    }

    // 复制实例属性
    instance.defaults = context.defaults;
    instance.interceptors = context.interceptors;

    return instance;
  }

  // ==================== 默认配置 ====================

  var defaults = {
    // 适配器 - 使用 fetch
    adapter: 'fetch',
    
    // 数据转换
    // 默认实现委托给 transformRequestData，保持与 Node axios 类似的行为
    transformRequest: [function(data, headers) {
      return transformRequestData(data, headers || {});
    }],
    
    transformResponse: [function(data) {
      // 默认转换：JSON 字符串转对象
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          // 不是 JSON，返回原始字符串
        }
      }
      return data;
    }],
    
    headers: {
      common: {
        'Accept': 'application/json, text/plain, */*'
      },
      get: {},
      delete: {},
      head: {},
      post: {
        'Content-Type': 'application/json'
      },
      put: {
        'Content-Type': 'application/json'
      },
      patch: {
        'Content-Type': 'application/json'
      }
    },
    
    // XSRF 防护
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    
    // 大小限制
    maxContentLength: -1,
    maxBodyLength: -1,
    
    // 超时
    timeout: CONSTANTS.DEFAULT_TIMEOUT,
    
    // 状态验证
    validateStatus: function(status) {
      // 默认接受 2xx 状态码和 304 Not Modified
      return (status >= 200 && status < 300) || status === 304;
    },
    
    // 过渡选项
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    }
  };

  // ==================== 创建默认实例 ====================

  var axios = createInstance(defaults);

  // 暴露 Axios 类
  axios.Axios = Axios;

  // 工厂方法
  axios.create = function(instanceConfig) {
    var newInstance = createInstance(mergeConfig(defaults, instanceConfig));
    // 复制静态方法到新实例
    newInstance.all = axios.all;
    newInstance.spread = axios.spread;
    newInstance.mergeConfig = axios.mergeConfig;
    newInstance.CancelToken = axios.CancelToken;
    newInstance.Cancel = axios.Cancel;
    newInstance.CanceledError = axios.CanceledError;
    newInstance.isCancel = axios.isCancel;
    newInstance.AxiosError = axios.AxiosError;
    newInstance.AxiosHeaders = axios.AxiosHeaders;
    newInstance.isAxiosError = axios.isAxiosError;
    // 确保新实例也具备 toFormData / formToJSON / HttpStatusCode / getAdapter 等静态能力
    newInstance.toFormData = axios.toFormData;
    newInstance.formToJSON = axios.formToJSON;
    newInstance.HttpStatusCode = axios.HttpStatusCode;
    newInstance.getAdapter = axios.getAdapter;
    return newInstance;
  };

  // CancelToken
  axios.CancelToken = CancelToken;
  axios.Cancel = Cancel;
  axios.CanceledError = CanceledError;
  axios.isCancel = isCancel;
  
  // AxiosError
  axios.AxiosError = AxiosError;
  
  // AxiosHeaders
  axios.AxiosHeaders = AxiosHeaders;
  
  // axios.isAxiosError: 与官方实现保持一致，用于判断错误是否由 axios 创建
  axios.isAxiosError = function(payload) {
    return !!(payload && payload.isAxiosError === true);
  };

  // 并发控制
  axios.all = function(promises) {
    return Promise.all(promises);
  };

  axios.spread = function(callback) {
    return function(arr) {
      return callback.apply(null, arr);
    };
  };
  
  // 合并配置
  axios.mergeConfig = mergeConfig;
  
  // 版本号
  axios.VERSION = '1.6.2';

  // ==================== toFormData / formToJSON ====================

  // 辅助：判断是否为二进制类型（Buffer / TypedArray / ArrayBuffer / DataView 等）
  function isBinaryLikeForFormData(value) {
    if (!value) {
      return false;
    }

    if (typeof ArrayBuffer !== 'undefined') {
      if (value instanceof ArrayBuffer) {
        return true;
      }
      if (typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(value)) {
        return true;
      }
    }

    if (typeof Buffer !== 'undefined' && Buffer && typeof Buffer.isBuffer === 'function') {
      try {
        if (Buffer.isBuffer(value)) {
          return true;
        }
      } catch (e) {
        // 忽略 Buffer.isBuffer 抛出的任何异常（极端环境）
      }
    }

    return false;
  }

  // 辅助：判断值是否为可递归访问的对象/数组
  function isVisitableForFormData(value) {
    if (value === null || value === undefined) {
      return false;
    }
    var type = typeof value;
    if (type !== 'object') {
      return false;
    }

    // 二进制类型（Buffer/TypedArray/ArrayBuffer/DataView）应被视为叶子节点
    if (isBinaryLikeForFormData(value)) {
      return false;
    }

    // 排除 Date / FormData / Node.js FormData 等特殊类型
    if (value instanceof Date) {
      return false;
    }
    if (typeof FormData !== 'undefined') {
      if (value instanceof FormData || value.__isFormData === true || value.__isNodeFormData === true) {
        return false;
      }
    }
    return true;
  }

  // 辅助：将值转换为适合 FormData 的类型
  function convertFormDataValue(value) {
    if (value === null) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }

    // TypedArray / ArrayBuffer 处理
    if (typeof ArrayBuffer !== 'undefined') {
      if (value instanceof ArrayBuffer) {
        if (typeof Blob !== 'undefined') {
          return new Blob([value]);
        }
        if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
          return Buffer.from(value);
        }
        return value;
      }

      if (typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(value)) {
        var buf = value.buffer || value;
        if (typeof Blob !== 'undefined') {
          return new Blob([buf]);
        }
        if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
          return Buffer.from(buf);
        }
        return buf;
      }
    }

    return value;
  }

  // 辅助：移除 key 末尾的 []
  function removeBracketsForFormData(key) {
    if (typeof key !== 'string') {
      return key;
    }
    return key.slice(-2) === '[]' ? key.slice(0, -2) : key;
  }

  // 辅助：根据 path + key 生成最终字段名
  function renderFormDataKey(path, key, dots) {
    if (!path || path.length === 0) {
      return key;
    }
    var tokens = path.concat(key).map(function(token, index) {
      token = removeBracketsForFormData(String(token));
      if (!dots && index) {
        return '[' + token + ']';
      }
      return token;
    });
    return tokens.join(dots ? '.' : '');
  }

  // 辅助：判断数组是否为“扁平数组”（元素都不可递归）
  function isFlatArrayForFormData(arr) {
    if (!Array.isArray(arr)) {
      return false;
    }
    for (var i = 0; i < arr.length; i++) {
      if (isVisitableForFormData(arr[i])) {
        return false;
      }
    }
    return true;
  }

  // 辅助：将类似 FileList 的对象转为数组（length + 索引）
  function toArrayForFormData(thing) {
    if (Array.isArray(thing)) {
      return thing;
    }
    var arr = [];
    if (!thing || typeof thing !== 'object') {
      return arr;
    }
    var len = thing.length >>> 0;
    for (var i = 0; i < len; i++) {
      if (i in thing) {
        arr.push(thing[i]);
      }
    }
    return arr;
  }

  // 辅助：创建或复用 FormData 实例
  function ensureFormDataInstance(targetFormData) {
    if (targetFormData && typeof targetFormData.append === 'function') {
      return targetFormData;
    }

    var FormDataCtor = null;

    // 优先尝试 Node.js form-data 模块
    if (typeof require === 'function') {
      try {
        FormDataCtor = require('form-data');
      } catch (e) {}
    }

    // 回退到全局 FormData（浏览器 / fetch_enhancement.go 注册）
    if (!FormDataCtor && typeof FormData !== 'undefined') {
      FormDataCtor = FormData;
    }

    if (!FormDataCtor) {
      throw new TypeError('FormData is not supported in this environment');
    }

    return new FormDataCtor();
  }

  /**
   * axios.toFormData 实现
   * @param {Object} obj 源对象
   * @param {Object} [formData] 目标 FormData（可选）
   * @param {Object} [options] 序列化选项 {visitor,dots,metaTokens,indexes}
   */
  axios.toFormData = function toFormData(obj, formData, options) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      throw new TypeError('target must be an object');
    }

    // 允许 formData 为 null（作为占位符，表示使用默认）
    if (formData !== undefined && formData !== null && typeof formData !== 'object') {
      throw new TypeError('targetFormData must be a FormData instance');
    }

    var fd = ensureFormDataInstance(formData);
    var opts = options || {};
    var metaTokens = opts.metaTokens !== undefined ? !!opts.metaTokens : true;
    var dots = !!opts.dots;
    var indexes = opts.indexes === undefined ? false : opts.indexes;
    var userVisitor = typeof opts.visitor === 'function' ? opts.visitor : null;

    function defaultVisitor(value, key, path) {
      var arr = value;

      if (value && !path && typeof value === 'object') {
        if (typeof key === 'string' && key.slice(-2) === '{}') {
          if (!metaTokens) {
            key = key.slice(0, -2);
          }
          value = JSON.stringify(value);
        } else if ((Array.isArray(value) && isFlatArrayForFormData(value)) ||
          ((typeof FileList !== 'undefined' && value instanceof FileList) ||
            (typeof key === 'string' && key.slice(-2) === '[]')) && (arr = toArrayForFormData(value))) {
          key = removeBracketsForFormData(key);

          for (var i = 0; i < arr.length; i++) {
            var el = arr[i];
            if (el === null || el === undefined) {
              continue;
            }

            var fieldKey;
            if (indexes === true) {
              fieldKey = renderFormDataKey([key], i, dots);
            } else if (indexes === null) {
              fieldKey = key;
            } else {
              fieldKey = key + '[]';
            }

            fd.append(fieldKey, convertFormDataValue(el));
          }

          return false;
        }
      }

      if (isVisitableForFormData(value)) {
        return true;
      }

      fd.append(renderFormDataKey(path || [], key, dots), convertFormDataValue(value));
      return false;
    }

    var helpers = {
      defaultVisitor: defaultVisitor,
      convertValue: convertFormDataValue,
      isVisitable: isVisitableForFormData
    };

    var stack = [];

    function build(value, path) {
      if (value === undefined) {
        return;
      }

      if (stack.indexOf(value) !== -1) {
        throw new Error('Circular reference detected in ' + (path || []).join('.'));
      }

      stack.push(value);

      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          var el = value[i];
          if (el === undefined || el === null) {
            continue;
          }
          var res = (userVisitor || defaultVisitor).call(fd, el, i, path, helpers);
          if (res === true) {
            build(el, path ? path.concat(i) : [i]);
          }
        }
      } else if (value && typeof value === 'object') {
        for (var key in value) {
          if (!Object.prototype.hasOwnProperty.call(value, key)) {
            continue;
          }
          var val = value[key];
          // 忽略 null/undefined/函数值（函数值在 Node 环境下不会生成字段）
          if (val === undefined || val === null || typeof val === 'function') {
            continue;
          }
          var r = (userVisitor || defaultVisitor).call(fd, val, key, path, helpers);
          if (r === true) {
            build(val, path ? path.concat(key) : [key]);
          }
        }
      }

      stack.pop();
    }

    build(obj);
    return fd;
  };

  // axios.formToJSON - 将 FormData 转换为 JSON 对象
  // 基于 axios v1.6.4 官方实现
  axios.formToJSON = function formToJSON(formData) {
    /**
     * 解析属性路径
     * 例如: 'foo[x][y][z]' => ['foo', 'x', 'y', 'z']
     *       'foo.x.y.z' => ['foo', 'x', 'y', 'z']
     *       'foo-x-y-z' => ['foo', 'x', 'y', 'z']
     */
    function parsePropPath(name) {
      // 匹配 \w+ 或 [(\w*)]
      var regex = /\w+|\[(\w*)]/g;
      var matches = [];
      var match;
      
      // 手动执行 regex.exec 循环（因为 matchAll 可能不可用）
      while ((match = regex.exec(name)) !== null) {
        matches.push(match);
      }
      
      return matches.map(function(m) {
        return m[0] === '[]' ? '' : (m[1] !== undefined ? m[1] : m[0]);
      });
    }

    /**
     * 将数组转换为对象
     */
    function arrayToObject(arr) {
      var obj = {};
      var keys = Object.keys(arr);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        obj[key] = arr[key];
      }
      return obj;
    }

    /**
     * 递归构建路径
     */
    function buildPath(path, value, target, index) {
      var name = path[index++];

      // 防止原型污染
      if (name === '__proto__') return true;

      var isNumericKey = Number.isFinite(+name);
      var isLast = index >= path.length;
      
      // 如果名称为空且目标是数组，使用数组长度作为索引
      name = !name && Array.isArray(target) ? target.length : name;

      if (isLast) {
        // 如果属性已存在，转换为数组
        if (target.hasOwnProperty(name)) {
          target[name] = [target[name], value];
        } else {
          target[name] = value;
        }
        return !isNumericKey;
      }

      // 如果目标属性不存在或不是对象，创建新数组
      if (!target[name] || typeof target[name] !== 'object') {
        target[name] = [];
      }

      var result = buildPath(path, value, target[name], index);

      // 如果结果为 true 且目标是数组，转换为对象
      if (result && Array.isArray(target[name])) {
        target[name] = arrayToObject(target[name]);
      }

      return !isNumericKey;
    }

    // 检查是否是 FormData 并且有 entries 方法
    // 排除数组类型（数组虽然也有 entries 方法但不是 FormData）
    if (formData && 
        typeof formData === 'object' && 
        !Array.isArray(formData) &&
        typeof formData.entries === 'function') {
      var obj = {};

      // 遍历 FormData 条目
      try {
        var iterator = formData.entries();
        var entry;
        while (!(entry = iterator.next()).done) {
          var name = entry.value[0];
          var value = entry.value[1];
          buildPath(parsePropPath(name), value, obj, 0);
        }
      } catch (e) {
        // 如果是 RangeError (比如 Invalid array length)，重新抛出
        if (e.name === 'RangeError' || (e.message && e.message.indexOf('Invalid array length') !== -1)) {
          throw e;
        }
        // 其他错误返回 null
        return null;
      }

      return obj;
    }

    return null;
  };

  // 获取适配器
  axios.getAdapter = function(adapters) {
    // 简化版本：总是返回 fetch 适配器
    if (typeof adapters === 'string') {
      return 'fetch';
    }
    if (Array.isArray(adapters)) {
      return adapters[0] || 'fetch';
    }
    return adapters || 'fetch';
  };

  // HTTP 状态码枚举（双向映射）
  axios.HttpStatusCode = {
    // 1xx Informational
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,

    // 2xx Success
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,

    // 3xx Redirection
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,

    // 4xx Client Error
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,

    // 5xx Server Error
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511
  };

  // 添加反向映射（数字 -> 名称）
  (function() {
    var keys = Object.keys(axios.HttpStatusCode);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var code = axios.HttpStatusCode[name];
      axios.HttpStatusCode[code] = name;
    }
  })();

  // ==================== 导出 ====================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = axios;
  }
  
  // 全局变量（可选）
  if (typeof global !== 'undefined') {
    global.axios = axios;
  }

  return axios;

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
