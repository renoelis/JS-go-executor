(function(global) {
  class ScriptAPI {
    constructor(options = {}) {
      this.getBaseUrl = options.getBaseUrl || (() => '');
      this.getToken = options.getToken || (() => '');
    }

    buildUrl(path, params) {
      const base = (this.getBaseUrl ? this.getBaseUrl() : '' || '').trim().replace(/\/$/, '');
      const baseUrl = base || window.location.origin;
      const finalPath = path.startsWith('/') ? path : `/${path}`;
      const url = new URL(finalPath, baseUrl);

      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          url.searchParams.append(key, value);
        });
      }

      return url.toString();
    }

    buildHeaders(includeToken = true, extra = {}) {
      const headers = Object.assign({}, extra);
      if (includeToken && this.getToken) {
        const token = this.getToken();
        if (token) headers['accessToken'] = token;
      }
      return headers;
    }

    async request(path, options = {}) {
      const { method = 'GET', params, body, includeToken = true, headers = {} } = options;
      try {
        const url = this.buildUrl(path, params);
        const requestOptions = {
          method,
          headers: this.buildHeaders(includeToken, headers),
        };

        if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
          if (!requestOptions.headers['Content-Type']) {
            requestOptions.headers['Content-Type'] = 'application/json';
          }
          requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, requestOptions);
        let data;
        try {
          data = await response.json();
        } catch (e) {
          data = { success: false, message: '响应解析失败' };
        }

        if (!response.ok && data && data.success === undefined) {
          data.success = false;
          data.status = response.status;
        }

        return data;
      } catch (error) {
        return { success: false, error: { message: error.message }, message: error.message };
      }
    }

    listScripts(params) {
      return this.request('/flow/scripts', { params });
    }

    getScript(scriptId, version) {
      const params = version ? { version } : undefined;
      return this.request(`/flow/scripts/${scriptId}`, { params });
    }

    createScript(data) {
      return this.request('/flow/scripts', { method: 'POST', body: data });
    }

    updateScript(scriptId, data) {
      return this.request(`/flow/scripts/${scriptId}`, { method: 'PUT', body: data });
    }

    deleteScript(scriptId) {
      return this.request(`/flow/scripts/${scriptId}`, { method: 'DELETE' });
    }

    executeScript(scriptId, options = {}) {
      const { method = 'POST', query, header, body } = options;
      const finalMethod = (method || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST';
      const params = query || {};
      const headers = Object.assign({ 'Content-Type': 'application/json' }, header || {});
      const payload = finalMethod === 'GET' ? undefined : (body || {});
      return this.request(`/flow/codeblock/${scriptId}`, {
        method: finalMethod,
        params,
        body: payload,
        includeToken: false,
        headers,
      });
    }
  }

  global.ScriptAPI = ScriptAPI;
})(window);
