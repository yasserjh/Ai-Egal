/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

export const useAuth = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [credits, setCredits] = useState(0);
    const [hasUsedFreeGeneration, setHasUsedFreeGeneration] = useState(false);
    
    // Initialize state from localStorage on component mount
    useEffect(() => {
        const freeUsed = authService.getGuestFreeGenerationStatus();
        setHasUsedFreeGeneration(freeUsed);
        if (!isSignedIn) {
            setCredits(freeUsed ? 0 : 1);
        }
    }, [isSignedIn]);

    const handleSignIn = useCallback(async () => {
        try {
            const user = await authService.signIn();
            setIsSignedIn(true);
            setUserName(user.name);
            setCredits(user.credits);
        } catch (error) {
            console.error("Sign in failed:", error);
            // In a real app, you might set an error state here
        }
    }, []);

    const handleSignOut = useCallback(async () => {
        await authService.signOut();
        setIsSignedIn(false);
        setUserName(null);
        authService.clearUserCredits();
        const freeUsed = authService.getGuestFreeGenerationStatus();
        setHasUsedFreeGeneration(freeUsed);
        setCredits(freeUsed ? 0 : 1);
    }, []);

    const handleAddCredits = useCallback((amount: number) => {
        setCredits(prev => {
            const newTotal = prev + amount;
            if (isSignedIn) {
                authService.saveUserCredits(newTotal);
            }
            return newTotal;
        });
    }, [isSignedIn]);
    
    const deductCredit = useCallback(() => {
        if (!isSignedIn) {
            setHasUsedFreeGeneration(true);
            authService.setGuestFreeGenerationUsed();
        }
        setCredits(prevCredits => {
            const newCredits = Math.max(0, prevCredits - 1);
            if (isSignedIn) {
                authService.saveUserCredits(newCredits);
            }
            return newCredits;
        });
    }, [isSignedIn]);

    return {
        isSignedIn,
        userName,
        credits,
        hasUsedFreeGeneration,
        handleSignIn,
        handleSignOut,
        handleAddCredits,
        deductCredit,
    };
};
