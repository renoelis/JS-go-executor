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
    
    // 复制 config1
    for (var key in config1) {
      if (config1.hasOwnProperty(key) && isSafeKey(key)) {
        result[key] = config1[key];
      }
    }
    
    // 合并 config2（防止原型污染）
    for (var key in config2) {
      if (config2.hasOwnProperty(key) && isSafeKey(key)) {
        if (key === 'headers' && result.headers) {
          // headers 需要深度合并
          result.headers = mergeHeaders(result.headers, config2.headers);
        } else {
          result[key] = config2[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 合并 headers（防止原型污染）
   * @param {Object} headers1 - 基础 headers
   * @param {Object} headers2 - 要合并的 headers
   * @returns {Object} 合并后的 headers
   */
  function mergeHeaders(headers1, headers2) {
    var result = {};
    
    for (var key in headers1) {
      if (headers1.hasOwnProperty(key) && isSafeKey(key)) {
        result[key] = headers1[key];
      }
    }
    
    for (var key in headers2) {
      if (headers2.hasOwnProperty(key) && isSafeKey(key)) {
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
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // 检查是否为相对 URL
    if (url.charAt(0) === '/') {
      return true;
    }
    
    // 检查绝对 URL 的协议
    try {
      var protocolMatch = url.match(/^([a-z][a-z0-9+\-.]*:)/i);
      if (protocolMatch) {
        var protocol = protocolMatch[1].toLowerCase();
        return CONSTANTS.VALID_PROTOCOLS.indexOf(protocol) !== -1;
      }
      return true; // 相对路径
    } catch (e) {
      return false;
    }
  }

  /**
   * 构建完整 URL
   * @param {string} baseURL - 基础 URL
   * @param {string} url - 相对 URL
   * @param {Object} params - 查询参数
   * @returns {string} 完整 URL
   */
  function buildURL(baseURL, url, params) {
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
      var serializedParams = serializeParams(params);
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
    
    for (var key in params) {
      if (params.hasOwnProperty(key) && isSafeKey(key)) {
        var value = params[key];
        
        if (value === null || value === undefined) {
          continue;
        }
        
        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            // 边界检查：跳过 null/undefined
            if (value[i] !== null && value[i] !== undefined) {
              parts.push(encodeURIComponent(key) + '[]=' + encodeURIComponent(value[i]));
            }
          }
        } else {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
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
    
    // 如果已经是 URLSearchParams、Blob 等，直接返回
    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      // URLSearchParams 需要设置 Content-Type
      headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
      return data;
    }
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data;
    }
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
      return data;
    }
    
    // 对象自动转 JSON
    if (typeof data === 'object' && data !== null) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      return JSON.stringify(data);
    }
    
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
   * 创建错误对象
   * @param {string} message - 错误消息
   * @param {Object} config - 配置
   * @param {string} code - 错误代码
   * @param {*} request - 请求对象
   * @param {*} response - 响应对象
   * @returns {Error} 错误对象
   */
  function createError(message, config, code, request, response) {
    var error = new Error(message);
    error.config = sanitizeConfig(config); // 移除敏感信息
    error.code = code;
    error.request = request;
    error.response = response;
    error.isAxiosError = true;
    
    error.toJSON = function() {
      return {
        message: this.message,
        name: this.name,
        code: this.code,
        config: this.config,
        request: this.request,
        response: this.response
      };
    };
    
    return error;
  }

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
   * @returns {number} 拦截器 ID
   */
  InterceptorManager.prototype.use = function(fulfilled, rejected) {
    this.handlers.push({
      fulfilled: fulfilled,
      rejected: rejected
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

    var token = this;
    executor(function cancel(message) {
      if (token.reason) {
        return; // 已经取消
      }

      token.reason = new Cancel(message || 'Operation canceled');
      controller.abort();
    });
  }

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
    this.message = message;
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
    return !!(value && value instanceof Cancel);
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

    if (config.timeout !== undefined && typeof config.timeout !== 'number') {
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
    // 检查取消
    throwIfCancellationRequested(config);

    // 构建完整 URL（带安全验证）
    var fullURL = buildURL(config.baseURL, config.url, config.params);

    // 准备 headers
    var headers = config.headers || {};

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
    if (data && config.method !== 'get' && config.method !== 'head') {
      // 🔥 应用自定义 transformRequest 或使用默认转换
      if (config.transformRequest) {
        data = applyTransformers(data, headers, config.transformRequest);
      } else {
        data = transformRequestData(data, headers);
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

    // 添加 AbortSignal
    if (config.cancelToken) {
      fetchOptions.signal = config.cancelToken.signal;
    }

    // 超时控制（修复内存泄漏）
    var timeoutId;
    var timeoutPromise = null;
    
    if (config.timeout && config.timeout > 0) {
      timeoutPromise = new Promise(function(_, reject) {
        timeoutId = setTimeout(function() {
          reject(createError(
            'timeout of ' + config.timeout + 'ms exceeded',
            config,
            'ECONNABORTED'
          ));
        }, config.timeout);
      });
    }

    // 发送请求
    var fetchPromise = fetch(fullURL, fetchOptions)
      .then(function(response) {
        // 检查取消
        throwIfCancellationRequested(config);

        // 读取响应数据（增强错误处理）
        var responseType = config.responseType || 'json';
        var dataPromise;
        
        // 🔥 特殊处理 HEAD 和 OPTIONS 请求：它们通常没有响应体
        var method = (config.method || 'GET').toUpperCase();
        if (method === 'HEAD' || method === 'OPTIONS') {
          // HEAD/OPTIONS 请求不尝试解析 body，直接返回空字符串或 null
          dataPromise = Promise.resolve(responseType === 'json' ? null : '');
        } else if (responseType === 'stream') {
          // 🔥 流式响应：直接返回 response.body（ReadableStream）
          dataPromise = Promise.resolve(response.body);
        } else if (responseType === 'json') {
          dataPromise = response.json().catch(function(jsonError) {
            // JSON 解析失败时降级为文本，但记录警告
            console.warn('Failed to parse JSON response, fallback to text:', jsonError.message);
            return response.text();
          });
        } else if (responseType === 'text') {
          dataPromise = response.text();
        } else if (responseType === 'blob') {
          dataPromise = response.blob();
        } else if (responseType === 'arraybuffer') {
          dataPromise = response.arrayBuffer();
        } else {
          dataPromise = response.text();
        }

        return dataPromise.then(function(data) {
          // 🔥 应用自定义 transformResponse
          var transformedData = data;
          if (config.transformResponse) {
            transformedData = applyTransformers(data, parseHeaders(response.headers), config.transformResponse);
          }

          var axiosResponse = {
            data: transformedData,
            status: response.status,
            statusText: response.statusText,
            headers: parseHeaders(response.headers),
            config: sanitizeConfig(config), // 净化配置
            request: fullURL
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
                fullURL,
                axiosResponse
              );
            }
          } else {
            // 默认验证：2xx 为成功
            if (!response.ok) {
              throw createError(
                'Request failed with status code ' + response.status,
                config,
                null,
                fullURL,
                axiosResponse
              );
            }
          }

          return axiosResponse;
        });
      })
      .catch(function(error) {
        // 检查是否为请求取消
        if (config.cancelToken && config.cancelToken.reason) {
          throw config.cancelToken.reason;
        }
        
        // 检查是否为 AbortController 触发的中断
        if (error.name === 'AbortError' || error.message === 'request aborted') {
          // 转换为 Cancel 错误
          throw new Cancel('Request canceled');
        }
        
        // 其他错误直接抛出
        throw error;
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
      result[key.toLowerCase()] = value;
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
  }

  // ==================== 便捷方法 ====================

  /**
   * 创建不带 data 的 HTTP 方法
   */
  function createShortMethods() {
    var methods = CONSTANTS.HTTP_METHODS_WITHOUT_DATA;
    
    methods.forEach(function(method) {
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url
        }));
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
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });
  }

  createShortMethods();
  createDataMethods();

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
    headers: {
      common: {
        'Accept': 'application/json, text/plain, */*'
      },
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
    timeout: CONSTANTS.DEFAULT_TIMEOUT,
    validateStatus: function(status) {
      return status >= 200 && status < 300;
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
    newInstance.CancelToken = axios.CancelToken;
    newInstance.Cancel = axios.Cancel;
    newInstance.isCancel = axios.isCancel;
    return newInstance;
  };

  // CancelToken
  axios.CancelToken = CancelToken;
  axios.Cancel = Cancel;
  axios.isCancel = isCancel;

  // 并发控制
  axios.all = function(promises) {
    return Promise.all(promises);
  };

  axios.spread = function(callback) {
    return function(arr) {
      return callback.apply(null, arr);
    };
  };

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
