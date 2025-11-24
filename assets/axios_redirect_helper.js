(function(global) {
  'use strict';

  function isRedirectStatus(status) {
    return status >= 300 && status < 400;
  }

  function resolveRedirectURL(currentUrl, location) {
    try {
      return new URL(location, currentUrl).toString();
    } catch (e) {
      return location;
    }
  }

  function removeMatchingHeaders(regex, headers) {
    if (!headers) return;
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (regex.test(key)) {
        delete headers[key];
      }
    }
  }

  function isSubdomain(targetHost, baseHost) {
    if (!targetHost || !baseHost) return false;
    if (targetHost === baseHost) return true;
    if (targetHost.length <= baseHost.length + 1) return false;
    return targetHost.slice(targetHost.length - baseHost.length - 1) === ('.' + baseHost);
  }

  function buildNodeLikeOptions(url, config, headers) {
    var urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return {
        protocol: null,
        hostname: null,
        port: null,
        path: url,
        method: (config.method || 'get').toUpperCase(),
        headers: headers
      };
    }

    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || null,
      path: urlObj.pathname + (urlObj.search || ''),
      method: (config.method || 'get').toUpperCase(),
      headers: headers
    };
  }

  function applyOptionsToConfig(options, baseConfig) {
    var protocol = options.protocol || 'http:';
    var host = options.hostname || '';
    var port = options.port ? (':' + options.port) : '';
    var path = options.path || '/';
    var nextUrl = protocol + '//' + host + port + path;

    var nextConfig = {};
    for (var key in baseConfig) {
      if (Object.prototype.hasOwnProperty.call(baseConfig, key)) {
        nextConfig[key] = baseConfig[key];
      }
    }

    nextConfig.method = (options.method || nextConfig.method || 'get').toLowerCase();
    nextConfig.headers = options.headers || nextConfig.headers;

    return {
      url: nextUrl,
      config: nextConfig
    };
  }

  function createAxiosLikeResponse(response, config, url, parseHeaders, sanitizeConfig) {
    var headersObj = parseHeaders(response.headers);
    return {
      data: null,
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
      config: sanitizeConfig(config),
      request: {
        path: url,
        url: url,
        method: (config.method || 'get').toUpperCase()
      }
    };
  }

  async function sendWithRedirects(config, fetchFn, buildURL, mergeHeaders, transformRequestData, applyTransformers, parseHeaders, sanitizeConfig, createError, throwIfCancellationRequested) {
    var maxRedirects = typeof config.maxRedirects === 'number' ? config.maxRedirects : 5;
    var redirectCount = 0;
    var currentConfig = config;
    var currentUrl = buildURL(config.baseURL, config.url, config.params, config.paramsSerializer);

    while (true) {
      throwIfCancellationRequested(currentConfig);

      var headers = mergeHeaders(currentConfig.headers, {}, currentConfig.method);

      if (currentConfig.auth) {
        if (typeof btoa !== 'function') {
          throw new Error('Basic Authentication requires btoa, which is not available in this environment');
        }
        var username = currentConfig.auth.username || '';
        var password = currentConfig.auth.password || '';
        headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
      }

      var data = currentConfig.data;
      if (currentConfig.transformRequest) {
        data = applyTransformers(data, headers, currentConfig.transformRequest);
      } else if (data && currentConfig.method !== 'get' && currentConfig.method !== 'head') {
        data = transformRequestData(data, headers);
      }

      var fetchOptions = {
        method: (currentConfig.method || 'get').toUpperCase(),
        headers: headers,
        redirect: 'manual'
      };

      if (data !== undefined && currentConfig.method !== 'get' && currentConfig.method !== 'head') {
        fetchOptions.body = data;
      }

      if (currentConfig.signal) {
        fetchOptions.signal = currentConfig.signal;
      } else if (currentConfig.cancelToken) {
        fetchOptions.signal = currentConfig.cancelToken.signal;
      }

      var response = await fetchFn(currentUrl, fetchOptions);

      throwIfCancellationRequested(currentConfig);

      var statusCode = response.status;

      if (!isRedirectStatus(statusCode)) {
        return {
          response: response,
          url: currentUrl,
          config: currentConfig
        };
      }

      var location = response.headers && response.headers.get ? response.headers.get('location') : null;
      if (!location) {
        return {
          response: response,
          url: currentUrl,
          config: currentConfig
        };
      }

      // maxRedirects = 0: 不跟随重定向，直接返回 3xx 响应
      // 让 axios.js 的 validateStatus 来决定是否视为错误
      if (maxRedirects === 0) {
        return {
          response: response,
          url: currentUrl,
          config: currentConfig
        };
      }

      if (redirectCount >= maxRedirects) {
        var axiosLike = createAxiosLikeResponse(response, currentConfig, currentUrl, parseHeaders, sanitizeConfig);
        throw createError(
          'Maximum number of redirects exceeded',
          currentConfig,
          'ERR_FR_TOO_MANY_REDIRECTS',
          axiosLike.request,
          undefined
        );
      }

      var originalMethod = (currentConfig.method || 'get').toUpperCase();

      if (((statusCode === 301 || statusCode === 302) && originalMethod === 'POST') ||
          (statusCode === 303 && originalMethod !== 'GET' && originalMethod !== 'HEAD')) {
        currentConfig.method = 'get';
        currentConfig.data = undefined;
        if (currentConfig.headers) {
          removeMatchingHeaders(/^content-/i, currentConfig.headers);
        }
        originalMethod = 'GET';
      }

      var nextUrl = resolveRedirectURL(currentUrl, location);

      var mergedHeaders = mergeHeaders(currentConfig.headers, {}, currentConfig.method);

      var currentUrlObj = null;
      var nextUrlObj = null;
      try {
        currentUrlObj = new URL(currentUrl);
      } catch (e) {}
      try {
        nextUrlObj = new URL(nextUrl);
      } catch (e) {}

      removeMatchingHeaders(/^host$/i, mergedHeaders);

      if (currentUrlObj && nextUrlObj) {
        var currentHost = currentUrlObj.host;
        var redirectHost = nextUrlObj.host;
        var downgrade = (currentUrlObj.protocol === 'https:' && nextUrlObj.protocol !== 'https:');
        var crossDomain = redirectHost !== currentHost && !isSubdomain(redirectHost, currentHost);
        if (downgrade || crossDomain) {
          removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, mergedHeaders);
          if (currentConfig.headers) {
            removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, currentConfig.headers);
          }
        }
      }

      var nodeOptions = buildNodeLikeOptions(nextUrl, currentConfig, mergedHeaders);
      var responseDetails = {
        headers: parseHeaders(response.headers),
        statusCode: statusCode,
        statusMessage: response.statusText,
        url: currentUrl
      };

      if (typeof currentConfig.beforeRedirect === 'function') {
        currentConfig.beforeRedirect(nodeOptions, responseDetails);
      }

      var applied = applyOptionsToConfig(nodeOptions, currentConfig);
      currentUrl = applied.url;
      currentConfig = applied.config;
      redirectCount++;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      sendWithRedirects: sendWithRedirects
    };
  } else {
    global.__AxiosRedirectHelper = {
      sendWithRedirects: sendWithRedirects
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
