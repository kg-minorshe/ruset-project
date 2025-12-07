import { CapacitorHttp } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export async function httpRSCap(url, options = {}) {
    const method = options.method?.toUpperCase() || "GET";
    const headers = options.headers || {};

    if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: "WTOKEN" });
        const requestOptions = {
            url,
            headers: {
                ...headers,
                Authorization: value ? `Bearer ${value}` : undefined,
            },
        };

        if (options.body) {
            requestOptions.data = options.body;
        }

        let response;
        try {
            switch (method) {
                case "GET":
                    response = await CapacitorHttp.get(requestOptions);
                    break;
                case "POST":
                    response = await CapacitorHttp.post(requestOptions);
                    break;
                case "PUT":
                    response = await CapacitorHttp.put(requestOptions);
                    break;
                case "PATCH":
                    response = await CapacitorHttp.patch(requestOptions);
                    break;
                case "DELETE":
                    response = await CapacitorHttp.delete(requestOptions);
                    break;
                default:
                    response = await CapacitorHttp.get(requestOptions);
            }
        } catch (error) {
            console.error('CapacitorHttp error:', error);
            throw error;
        }

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: '',
            headers: {
                get: (name) => response.headers[name],
                entries: () => Object.entries(response.headers || {}),
                has: (name) => name in (response.headers || {})
            },
            json: async () => {
                try {
                    return typeof response.data === 'object'
                        ? response.data
                        : JSON.parse(response.data);
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                    throw e;
                }
            },
            text: async () => typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data),
            clone: () => ({ ...response })
        };
    } else {
        const fetchOptions = {
            method,
            credentials: options.credentials || "include",
            headers,
        };

        if (options.body) {
            fetchOptions.body = options.body;
        }

        return fetch(url, fetchOptions);
    }
}