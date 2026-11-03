(function () {
  const config = window.SATRIA_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || '').replace(/\/+$/, '');
  const supabase = window.supabase;
  const authClient = supabase && config.supabaseUrl && config.supabaseAnonKey
    ? supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    })
    : null;

  window.satriaSupabase = authClient;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requestUrl, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init && init.headers).forEach((value, key) => headers.set(key, value));
    if (authClient) {
      const { data, error } = await authClient.auth.getSession();
      if (error) throw error;
      const accessToken = data.session && data.session.access_token;
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const apiUrl = `${apiBaseUrl}${url.pathname}${url.search}`;
    const requestOptions = Object.assign({}, init || {}, { headers });
    if (input instanceof Request) return originalFetch(new Request(apiUrl, input), requestOptions);
    return originalFetch(apiUrl, requestOptions);
  };
})();
