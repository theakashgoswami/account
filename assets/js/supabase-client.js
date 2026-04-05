// supabase-client.js - No external CDN, create client manually
(function() {
    if (window._supabaseInitialized) {
        console.log("✅ Supabase already initialized");
        return;
    }
    
    console.log("🚀 Initializing Supabase client...");

    // Create Supabase client without external CDN
    async function initSupabase() {
        try {
            // First get session from worker
            const res = await fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            });
            const data = await res.json();
            
            if (!data.authenticated || !data.supabase_token) {
                console.log("ℹ️ No Supabase token available, using worker-only mode");
                window._supabaseSessionReady = false;
                window._supabaseInitialized = true;
                return;
            }
            
            // Create a simple Supabase REST client (no external library)
            window.supabase = {
                token: data.supabase_token,
                url: data.supabase_url,
                anonKey: data.supabase_anon_key,
                
                // Generic fetch method
                async fetch(path, options = {}) {
                    const response = await fetch(`${this.url}/rest/v1/${path}`, {
                        ...options,
                        headers: {
                            'apikey': this.anonKey,
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json',
                            ...options.headers
                        }
                    });
                    return response;
                },
                
                // Query builder for user_profiles
                from(table) {
                    return {
                        select: (columns, options = {}) => ({
                            eq: async (column, value) => {
                                const query = `${columns ? columns : '*'}&${column}=eq.${encodeURIComponent(value)}`;
                                const resp = await window.supabase.fetch(`${table}?select=${query}`, {
                                    method: 'GET'
                                });
                                return resp.json();
                            },
                            single: async () => {
                                const resp = await window.supabase.fetch(`${table}?select=${columns ? columns : '*'}`, {
                                    method: 'GET'
                                });
                                const data = await resp.json();
                                return { data: data[0] || null, error: null };
                            },
                            maybeSingle: async () => {
                                const resp = await window.supabase.fetch(`${table}?select=${columns ? columns : '*'}`, {
                                    method: 'GET'
                                });
                                const data = await resp.json();
                                return { data: data[0] || null, error: null };
                            },
                            order: (column, { ascending } = {}) => ({
                                limit: async (limit) => {
                                    const orderDir = ascending ? 'asc' : 'desc';
                                    const resp = await window.supabase.fetch(`${table}?select=${columns ? columns : '*'}&order=${column}.${orderDir}&limit=${limit}`, {
                                        method: 'GET'
                                    });
                                    return resp.json();
                                }
                            })
                        }),
                        insert: (body) => ({
                            select: async () => {
                                const resp = await window.supabase.fetch(`${table}`, {
                                    method: 'POST',
                                    body: JSON.stringify(body)
                                });
                                return resp.json();
                            }
                        })
                    };
                },
                
                // Auth helpers
                auth: {
                    getUser: async () => {
                        // Token already validated by worker
                        return { data: { user: { id: window.currentUser?.supabase_uid } }, error: null };
                    },
                    getSession: async () => {
                        return { data: { session: { access_token: window.supabase.token } }, error: null };
                    }
                }
            };
            
            window._supabaseSessionReady = true;
            window._supabaseInitialized = true;
            console.log("✅ Supabase client initialized with worker token");
            
        } catch (err) {
            console.warn("⚠️ Failed to init Supabase:", err.message);
            window._supabaseSessionReady = false;
            window._supabaseInitialized = true;
        }
    }
    
    // Helper functions
    window.isSupabaseReady = () => window._supabaseSessionReady === true;
    window.waitForSupabase = async (timeout = 5000) => {
        const start = Date.now();
        while (!window._supabaseSessionReady && (Date.now() - start) < timeout) {
            await new Promise(r => setTimeout(r, 100));
        }
        return window._supabaseSessionReady;
    };
    
    window.getCurrentUserProfile = async function() {
        if (!window._supabaseSessionReady) return null;
        try {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', window.currentUser?.user_id)
                .maybeSingle();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Profile fetch error:", err);
            return null;
        }
    };
    
    // Initialize
    initSupabase();
})();