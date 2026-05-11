export function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = window.crypto.getRandomValues(new Uint8Array(length));
    let result = '';
    for (let i = 0; i < randomValues.length; i++) {
        result += charset[randomValues[i] % charset.length];
    }
    return result;
}

export async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

export function base64urlencode(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function preparePKCE(): Promise<string> {
    const verifier = generateRandomString(128);
    const challengeBuffer = await sha256(verifier);
    const challenge = base64urlencode(challengeBuffer);
    sessionStorage.setItem('pkce_verifier', verifier);
    return challenge;
}
