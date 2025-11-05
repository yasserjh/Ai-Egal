/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface User {
    name: string;
    credits: number;
}

/**
 * Simulates a sign-in process.
 * In a real app, this would involve an API call.
 */
export const signIn = async (): Promise<User> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const storedCredits = parseInt(localStorage.getItem('egal_user_credits') || '0', 10);
    
    // Return a mock user
    return {
        name: 'Yusuf A.', // Placeholder name
        credits: storedCredits,
    };
};

/**
 * Simulates a sign-out process.
 */
export const signOut = async (): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    // In a real app, you might invalidate a token on the server.
    // This is a placeholder for that logic.
};

/**
 * Manages credits in localStorage for signed-in users.
 */
export const saveUserCredits = (credits: number): void => {
    localStorage.setItem('egal_user_credits', credits.toString());
};

export const clearUserCredits = (): void => {
    localStorage.removeItem('egal_user_credits');
};


/**
 * Manages guest state in localStorage.
 */
export const getGuestFreeGenerationStatus = (): boolean => {
    return localStorage.getItem('egal_guest_free_used') === 'true';
};

export const setGuestFreeGenerationUsed = (): void => {
    localStorage.setItem('egal_guest_free_used', 'true');
};
