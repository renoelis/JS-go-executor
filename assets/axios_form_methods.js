// axios Form Methods Patch
// 为 axios 实例添加 postForm、putForm、patchForm 方法
(function() {
  'use strict';
  
  if (typeof axios === 'undefined') {
    return;
  }
  
  // 为主 axios 对象添加 Form 方法
  function addFormMethods(instance) {
    if (!instance || typeof instance !== 'function') {
      return;
    }
    
    // 添加 postForm 方法
    if (!instance.postForm) {
      instance.postForm = function(url, data, config) {
        var finalConfig = Object.assign({}, config || {});
        finalConfig.method = 'post';
        finalConfig.url = url;
        
        // 转换数据为 FormData
        if (data && typeof data === 'object' && !(data instanceof FormData)) {
          var formData = new FormData();
          for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              formData.append(key, data[key]);
            }
          }
          finalConfig.data = formData;
        } else {
          finalConfig.data = data;
        }
        
        // 设置 Content-Type header
        if (!finalConfig.headers) {
          finalConfig.headers = {};
        }
        finalConfig.headers['Content-Type'] = 'multipart/form-data';
        return instance.request(finalConfig);
      };
    }
    
    // 添加 putForm 方法
    if (!instance.putForm) {
      instance.putForm = function(url, data, config) {
        var finalConfig = Object.assign({}, config || {});
        finalConfig.method = 'put';
        finalConfig.url = url;
        
        // 转换数据为 FormData
        if (data && typeof data === 'object' && !(data instanceof FormData)) {
          var formData = new FormData();
          for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              formData.append(key, data[key]);
            }
          }
          finalConfig.data = formData;
        } else {
          finalConfig.data = data;
        }
        
        // 设置 Content-Type header
        if (!finalConfig.headers) {
          finalConfig.headers = {};
        }
        finalConfig.headers['Content-Type'] = 'multipart/form-data';
        return instance.request(finalConfig);
      };
    }
    
    // 添加 patchForm 方法
    if (!instance.patchForm) {
      instance.patchForm = function(url, data, config) {
        var finalConfig = Object.assign({}, config || {});
        finalConfig.method = 'patch';
        finalConfig.url = url;
        
        // 转换数据为 FormData
        if (data && typeof data === 'object' && !(data instanceof FormData)) {
          var formData = new FormData();
          for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              formData.append(key, data[key]);
            }
          }
          finalConfig.data = formData;
        } else {
          finalConfig.data = data;
        }
        
        // 设置 Content-Type header
        if (!finalConfig.headers) {
          finalConfig.headers = {};
        }
        finalConfig.headers['Content-Type'] = 'multipart/form-data';
        return instance.request(finalConfig);
      };
    }
  }
  
  // 为全局 axios 添加方法
  addFormMethods(axios);
  
  // 包装 axios.create 方法，确保新创建的实例也有这些方法
  var originalCreate = axios.create;
  if (originalCreate) {
    axios.create = function(config) {
      var instance = originalCreate.call(axios, config);
      addFormMethods(instance);
      return instance;
    };
  }
})();
