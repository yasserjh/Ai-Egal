/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHeadshot } from './services/geminiService';
import { StyleCard, HeadshotCard } from './components/PolaroidCard';
import { STYLES, t } from './lib/albumUtils';
import type { StyleKey } from './lib/albumUtils';
import { cn } from './lib/utils';
import Footer from './components/Footer';
import { EgalLogo, CloseIcon, UserIcon } from './components/ui/draggable-card';
import { useAuth } from './hooks/useAuth';

type AppState = 'idle' | 'selecting' | 'generating' | 'results';
type ImageStatus = 'pending' | 'done' | 'error' | 'discarded';
type ModalContentType = 'privacy' | 'terms';

interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-bold text-lg text-center text-white bg-[#006C35] py-4 px-10 rounded-2xl transform transition-all duration-300 ease-in-out hover:scale-[1.03] hover:bg-opacity-90 shadow-lg shadow-[#006C35]/20 focus:outline-none focus:ring-4 focus:ring-[#006C35]/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none";
const secondaryButtonClasses = "font-bold text-base text-center text-[#1C1C1C] bg-neutral-200/80 py-2 px-5 rounded-xl transform transition-transform duration-200 hover:scale-105 hover:bg-neutral-200 disabled:opacity-50 disabled:hover:scale-100";
const tertiaryButtonClasses = "font-semibold text-sm text-center text-[#1C1C1C] hover:text-[#006C35] transition-colors disabled:opacity-50 disabled:hover:text-[#1C1C1C] disabled:cursor-not-allowed";

// --- Header Component ---
const Header = ({ lang, setLang, appState, isSignedIn, credits, userName, onSignIn, onSignOut }: { 
    lang: 'en' | 'ar', 
    setLang: (lang: 'en' | 'ar') => void, 
    appState: AppState,
    isSignedIn: boolean,
    credits: number,
    userName: string | null,
    onSignIn: () => void,
    onSignOut: () => void,
}) => {
    const toggleLang = () => {
        setLang(lang === 'en' ? 'ar' : 'en');
    };
    return (
        <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto flex justify-between items-center"
            >
                <div className={`text-2xl font-bold text-[#1C1C1C] transition-opacity duration-300 ${appState === 'idle' && !isSignedIn ? 'opacity-0' : 'opacity-100'}`}>
                    <EgalLogo lang={lang} />
                </div>
                <div className="flex items-center gap-x-3 sm:gap-x-4">
                    {isSignedIn ? (
                        <div className="flex items-center gap-x-3 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-full px-3 py-1.5 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-[#006C35] flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col ltr:text-left rtl:text-right">
                                <span className="text-sm font-bold text-[#1C1C1C] leading-none">{userName}</span>
                                <span className="text-xs text-neutral-500 leading-none mt-0.5">{t(lang, 'credits')}: {credits}</span>
                            </div>
                            <button onClick={onSignOut} className="ltr:ml-2 rtl:mr-2 text-xs text-neutral-500 hover:text-red-600 transition-colors">{t(lang, 'signOut')}</button>
                        </div>
                    ) : (
                        <button onClick={onSignIn} className="font-bold text-sm bg-white/80 backdrop-blur-sm border-2 border-neutral-300 text-[#1C1C1C] rounded-full px-5 py-1.5 hover:bg-[#1C1C1C] hover:text-white transition-all duration-300 shadow-sm">
                            {t(lang, 'signIn')}
                        </button>
                    )}
                     <button
                        onClick={toggleLang}
                        className="font-bold text-sm border-2 border-neutral-300 text-[#1C1C1C] rounded-full px-4 py-1.5 hover:bg-[#1C1C1C] hover:text-white transition-colors duration-300"
                        aria-label={t(lang, 'toggleLanguage')}
                    >
                        {lang === 'en' ? 'AR' : 'EN'}
                    </button>
                </div>
            </motion.div>
        </header>
    );
};

// --- Modals ---
// FIX: Implemented the Modal component to display content. It was previously returning void.
const Modal = ({ lang, contentKey, onClose }: { lang: 'en' | 'ar', contentKey: ModalContentType, onClose: () => void }) => {
    const titleKey = contentKey === 'privacy' ? 'privacyTitle' : 'termsTitle';
    const contentKeyString = contentKey === 'privacy' ? 'privacyContent' : 'termsContent';
    const title = t(lang, titleKey);
    const content = t(lang, contentKeyString);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="relative bg-[#F9F9F9] rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl border border-neutral-200/80 max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-neutral-200 sticky top-0 bg-[#F9F9F9] rounded-t-2xl z-10">
                    <h2 className="text-2xl font-bold text-[#1C1C1C]">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors" aria-label="Close">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto">
                    <p className="text-neutral-600 whitespace-pre-wrap text-sm leading-relaxed">
                        {content}
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

const PricingModal = ({ lang, onAddCredits, onClose }: { lang: 'en' | 'ar', onAddCredits: (amount: number) => void, onClose: () => void }) => {
    const packages = [
        { key: 'starterPlan' as const, credits: 10, price: '29 SAR', color: 'bg-neutral-200', textColor: 'text-neutral-800' },
        { key: 'standardPlan' as const, credits: 25, price: '50 SAR', color: 'bg-[#006C35]', textColor: 'text-white' },
        { key: 'premiumPlan' as const, credits: 60, price: '99 SAR', color: 'bg-neutral-800', textColor: 'text-white' },
    ];

    return (
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="relative bg-[#F9F9F9] rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl border border-[#C6A664]/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-neutral-200">
                    <h2 className="text-2xl font-bold text-[#1C1C1C]">{t(lang, 'pricingTitle')}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors" aria-label="Close">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 text-center">
                    <p className="text-neutral-600 max-w-2xl mx-auto">{t(lang, 'pricingSub')}</p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map((pkg, index) => (
                            <motion.div 
                                key={pkg.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "rounded-2xl p-6 flex flex-col justify-between border",
                                    pkg.key === 'standardPlan' ? "border-[#C6A664] shadow-lg shadow-[#C6A664]/20" : "border-neutral-200/80"
                                )}
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-[#1C1C1C]">{t(lang, pkg.key)}</h3>
                                    <p className="text-5xl font-bold text-[#006C35] mt-4">{pkg.credits}</p>
                                    <p className="text-neutral-500 font-medium">{t(lang, 'creditsCount')}</p>
                                </div>
                                <div className="mt-6">
                                    <p className="text-lg font-semibold text-[#1C1C1C] mb-4">{pkg.price}</p>
                                    <button 
                                        onClick={() => onAddCredits(pkg.credits)}
                                        className="w-full font-bold text-base text-center text-white bg-[#C6A664] py-3 px-6 rounded-xl transform transition-all duration-300 ease-in-out hover:scale-[1.03] hover:bg-opacity-90 shadow-lg shadow-[#C6A664]/20 focus:outline-none focus:ring-4 focus:ring-[#C6A664]/50"
                                    >
                                        {t(lang, 'buyButton')}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- Toast Notification Component ---
const Toast = ({ message, onClear }: { message: string, onClear: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClear();
        }, 3000); // Disappear after 3 seconds
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-neutral-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg"
        >
            {message}
        </motion.div>
    );
};


// --- Main App Component ---
function App() {
    const [lang, setLang] = useState<'en' | 'ar'>('en');
    const [appState, setAppState] = useState<AppState>('idle');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [selectedStyles, setSelectedStyles] = useState<StyleKey[]>([]);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContentType | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

    // User Access State from useAuth hook
    const {
        isSignedIn,
        userName,
        credits,
        hasUsedFreeGeneration,
        handleSignIn: authHandleSignIn,
        handleSignOut,
        handleAddCredits: authHandleAddCredits,
        deductCredit,
    } = useAuth();
    
    const allStyleKeys = useMemo(() => Object.keys(STYLES) as StyleKey[], []);
    
    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);
    
    // Handlers that interact with both auth and UI state
    const handleSignIn = () => {
        authHandleSignIn();
        setIsPricingModalOpen(true);
    };

    const handleAddCredits = (amount: number) => {
        authHandleAddCredits(amount);
        setIsPricingModalOpen(false);
    };

    const processFile = (file: File) => {
        setError(null);
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            setError(t(lang, 'errorInvalidFileType'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError(t(lang, 'errorFileTooLarge'));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
            setAppState('selecting');
            setGeneratedImages({});
            setSelectedStyles([]);
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };
    
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleStyleToggle = (styleKey: StyleKey) => {
        const isCurrentlySelected = selectedStyles.includes(styleKey);

        if (isCurrentlySelected) {
            // Always allow deselecting
            setSelectedStyles(prev => prev.filter(k => k !== styleKey));
        } else {
            // Check credits before selecting a new style
            if (selectedStyles.length >= credits) {
                setToastMessage(t(lang, 'notEnoughCreditsToSelect'));
                return;
            }
            setSelectedStyles(prev => [...prev, styleKey]);
        }
    };
    
    const handleSelectAllToggle = () => {
        if (!isSignedIn && hasUsedFreeGeneration) return;
    
        const maxSelectable = Math.min(allStyleKeys.length, credits);
        const isFullySelected = selectedStyles.length > 0 && selectedStyles.length === maxSelectable;
    
        if (isFullySelected) {
            setSelectedStyles([]);
        } else {
            // Select up to the number of credits available
            const stylesToSelect = allStyleKeys.slice(0, credits);
            setSelectedStyles(stylesToSelect);
        }
    };

    const runGeneration = useCallback(async (stylesToGenerate: StyleKey[]) => {
        if (!uploadedImage) return;
        if (credits < stylesToGenerate.length) {
            if (isSignedIn) setIsPricingModalOpen(true);
            return;
        }

        stylesToGenerate.forEach(() => deductCredit());

        setGeneratedImages(prev => {
            const newImages = { ...prev };
            stylesToGenerate.forEach(key => {
                newImages[key] = { status: 'pending' };
            });
            return newImages;
        });

        const processStyle = async (key: StyleKey) => {
            try {
                const styleDetails = STYLES[key];
                const resultUrl = await generateHeadshot(uploadedImage, styleDetails);
                setGeneratedImages(prev => ({
                    ...prev,
                    [key]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : t(lang, 'errorUnknown');
                setGeneratedImages(prev => ({
                    ...prev,
                    [key]: { status: 'error', error: errorMessage },
                }));
            }
        };

        const concurrencyLimit = 2;
        const queue = [...stylesToGenerate];
        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (queue.length > 0) {
                const key = queue.shift();
                if (key) {
                    await processStyle(key);
                }
            }
        });

        await Promise.all(workers);

    }, [uploadedImage, lang, credits, deductCredit, isSignedIn]);


    const handleGenerateClick = async () => {
        if (selectedStyles.length === 0) return;
        
        const creditCost = selectedStyles.length;
        if (credits < creditCost) {
            if (isSignedIn) setIsPricingModalOpen(true);
            return;
        }
        
        setAppState('generating');
        await runGeneration(selectedStyles);
        setAppState('results');
    };

    const handleRegenerate = async (key: StyleKey) => {
        if (credits < 1) {
            if (isSignedIn) setIsPricingModalOpen(true);
            return;
        }
        setGeneratedImages(prev => ({ ...prev, [key]: { status: 'pending' } }));
        await runGeneration([key]);
    };

    const handleDiscard = (key: StyleKey) => {
        setGeneratedImages(prev => ({ ...prev, [key]: { status: 'discarded' } }));
    };

    const handleRegenerateAll = async () => {
        const keysToRegenerate = (Object.entries(generatedImages) as [string, GeneratedImage][])
            .filter(([, image]) => image.status === 'done' || image.status === 'error')
            .map(([key]) => key as StyleKey);
        
        if (keysToRegenerate.length > 0) {
             if (credits < keysToRegenerate.length) {
                if (isSignedIn) setIsPricingModalOpen(true);
                return;
            }
            setAppState('generating');
            await runGeneration(keysToRegenerate);
            setAppState('results');
        }
    };

    const handleStartOver = () => {
        setUploadedImage(null);
        setSelectedStyles([]);
        setGeneratedImages({});
        setError(null);
        setAppState('idle');
    };

    const handleModalOpen = (contentType: ModalContentType) => {
        setModalContent(contentType);
    };

    const handleModalClose = () => {
        setModalContent(null);
    };

    const generationProgress = useMemo(() => {
        const total = Object.keys(generatedImages).length;
        if (total === 0) return 0;
        const done = Object.values(generatedImages).filter((img: GeneratedImage) => img.status === 'done' || img.status === 'error').length;
        return done / total;
    }, [generatedImages]);

    const canRegenerateAll = useMemo(() => {
        return Object.values(generatedImages).some((image: GeneratedImage) => image.status === 'done' || image.status === 'error');
    }, [generatedImages]);
    
    const isGenerating = appState === 'generating' || (appState === 'results' && generationProgress < 1 && generationProgress > 0);
    
    const isLockedForGuest = !isSignedIn && hasUsedFreeGeneration;
    const isOutOfCredits = isSignedIn && credits === 0;
    const canGenerate = selectedStyles.length > 0 && credits >= selectedStyles.length && !isGenerating;

    return (
        <main 
            className={cn(
                "bg-[#F9F9F9] text-[#1C1C1C] min-h-screen w-full flex flex-col items-center justify-center p-4 selection:bg-[#006C35]/30 transition-colors duration-500",
                lang === 'ar' ? 'font-noto-sans-arabic' : 'font-inter',
                appState === 'idle' && 'relative overflow-hidden subtle-glow-bg'
            )}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onDragEnter={handleDragEnter}
        >
            <Header lang={lang} setLang={setLang} appState={appState} isSignedIn={isSignedIn} credits={credits} userName={userName} onSignIn={handleSignIn} onSignOut={handleSignOut} />

            <AnimatePresence mode="wait">
                {appState === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="relative z-10 flex flex-col items-center justify-center text-center p-6 w-full max-w-lg"
                    >
                        <EgalLogo lang={lang} isLarge={true} />
                        <h2 className="text-2xl md:text-3xl font-medium text-neutral-600 mt-4 leading-tight">{t(lang, 'mainHeading')}</h2>
                        <label htmlFor="file-upload" className={`mt-10 cursor-pointer ${primaryButtonClasses}`}>
                            {t(lang, 'uploadButton')}
                        </label>
                         <p className="mt-4 text-sm text-neutral-500">{t(lang, 'uploadSubText')}</p>
                        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        {error && <p className="mt-4 text-red-600">{error}</p>}
                    </motion.div>
                )}
                
                {appState === 'selecting' && uploadedImage && (
                    <motion.div
                        key="selecting"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="z-10 flex flex-col items-center w-full max-w-7xl pt-20 pb-10"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-center">{t(lang, 'selectStyles')}</h2>
                        <p className="text-neutral-500 mt-2 text-center">
                            {!isSignedIn && !hasUsedFreeGeneration 
                                ? t(lang, 'freeGeneration') 
                                : t(lang, 'selectionCounter')
                                    .replace('{selected}', selectedStyles.length.toString())
                                    .replace('{total}', credits.toString())
                            }
                        </p>

                        <div className="mt-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-1 flex flex-col items-center gap-4 p-4 rounded-3xl bg-white shadow-sm border border-neutral-200/80 lg:sticky top-24">
                                <img src={uploadedImage} alt={t(lang, 'yourPortrait')} className="rounded-2xl w-full max-w-[250px] aspect-square object-cover" />
                                 <button onClick={handleStartOver} className={`${secondaryButtonClasses} w-full text-sm py-2 px-4`}>
                                    {t(lang, 'changePhotoButton')}
                                </button>
                             </div>
                             
                             <div className="lg:col-span-2 flex flex-col gap-3">
                                {allStyleKeys.map(key => {
                                    const isSelected = selectedStyles.includes(key);
                                    const isSelectionDisabled = !isSelected && selectedStyles.length >= credits;
                                    return (
                                        <StyleCard 
                                            key={key} 
                                            styleKey={key} 
                                            isSelected={isSelected} 
                                            onToggle={handleStyleToggle} 
                                            lang={lang} 
                                            isLocked={isLockedForGuest}
                                            isSelectionDisabled={isSelectionDisabled}
                                        />
                                    );
                                })}
                             </div>
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-4">
                            <button onClick={handleGenerateClick} className={primaryButtonClasses} disabled={!canGenerate}>
                                {t(lang, 'generateButton')} ({selectedStyles.length})
                            </button>
                            {!isLockedForGuest && (
                                <button onClick={handleSelectAllToggle} className="font-medium text-sm text-neutral-600 cursor-pointer hover:text-[#006C35] transition-colors">
                                    {(() => {
                                        const maxSelectable = Math.min(allStyleKeys.length, credits);
                                        const isFullySelected = selectedStyles.length > 0 && selectedStyles.length === maxSelectable;
                                        return isFullySelected
                                            ? t(lang, 'deselectAll')
                                            : t(lang, 'selectAll').replace('{count}', maxSelectable.toString());
                                    })()}
                                </button>
                            )}
                             {isLockedForGuest && (
                                <p className="text-center font-medium text-neutral-600">{t(lang, 'freeLimitReached')} <button onClick={handleSignIn} className="font-bold text-[#006C35] hover:underline">{t(lang, 'signIn')}</button> {t(lang, 'unlockFullAccess')}</p>
                            )}
                            {isOutOfCredits && (
                                <p className="text-center font-medium text-neutral-600">{t(lang, 'outOfCredits')} <button onClick={() => setIsPricingModalOpen(true)} className="font-bold text-[#006C35] hover:underline">{t(lang, 'buyMoreCredits')}</button></p>
                            )}
                        </div>
                    </motion.div>
                )}

                {(appState === 'generating' || appState === 'results') && (
                     <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="z-10 w-full max-w-7xl flex-1 flex flex-col items-center pt-24 pb-32"
                    >
                         <AnimatePresence>
                        {isGenerating && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8 text-center"
                            >
                                <div className="relative w-20 h-20 mx-auto">
                                    <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                                        <circle className="text-neutral-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                                        <circle
                                            className="text-[#006C35] progress-ring"
                                            strokeWidth="8"
                                            strokeDasharray={45 * 2 * Math.PI}
                                            strokeDashoffset={(45 * 2 * Math.PI) * (1 - generationProgress)}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="45" cx="50" cy="50"
                                        />
                                    </svg>
                                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xl font-bold text-[#006C35]">
                                        {Math.round(generationProgress * 100)}%
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold mt-4">{t(lang, 'generatingTitle')}</h2>
                                <p className="text-neutral-500 mt-2">{t(lang, 'generatingSub')}</p>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        {!isGenerating && Object.keys(generatedImages).length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mb-8 text-center"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold">{t(lang, 'resultsTitle')}</h2>
                                <p className="text-neutral-500 mt-2 mb-6">{t(lang, 'resultsSub')}</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <button 
                                        onClick={handleRegenerateAll} 
                                        className={tertiaryButtonClasses} 
                                        disabled={isGenerating || !canRegenerateAll || credits < (Object.values(generatedImages).filter((image: GeneratedImage) => image.status !== 'discarded').length)}
                                    >
                                        {t(lang, 'regenerateAllButton')}
                                    </button>
                                    <button onClick={handleStartOver} className={primaryButtonClasses} disabled={isGenerating}>
                                        {t(lang, 'startOverButton')}
                                    </button>
                                </div>
                                {credits < (Object.values(generatedImages).filter((image: GeneratedImage) => image.status !== 'discarded').length) && isSignedIn &&
                                    <p className="text-sm text-amber-600 mt-2">{t(lang, 'insufficientCredits')}</p>
                                }
                            </motion.div>
                        )}

                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(Object.entries(generatedImages) as [string, GeneratedImage][])
                                .filter(([, image]) => image.status !== 'discarded')
                                .sort(([a], [b]) => allStyleKeys.indexOf(a as StyleKey) - allStyleKeys.indexOf(b as StyleKey))
                                .map(([key, image]) => (
                                    <HeadshotCard
                                        key={key}
                                        styleKey={key as StyleKey}
                                        status={image.status}
                                        imageUrl={image.url}
                                        error={image.error}
                                        onRegenerate={() => handleRegenerate(key as StyleKey)}
                                        onDiscard={() => handleDiscard(key as StyleKey)}
                                        lang={lang}
                                    />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isDragging && appState === 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragOver={handleDragEvents}
                        className="fixed inset-0 bg-[#F9F9F9]/80 backdrop-blur-md flex items-center justify-center z-50 border-4 border-dashed border-[#006C35] rounded-3xl m-4"
                    >
                         <div className="text-center">
                            <h2 className="text-3xl font-bold text-[#006C35]">{t(lang, 'dropPrompt')}</h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalContent && (
                    <Modal lang={lang} contentKey={modalContent} onClose={handleModalClose} />
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isPricingModalOpen && (
                    <PricingModal lang={lang} onAddCredits={handleAddCredits} onClose={() => setIsPricingModalOpen(false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage(null)} />}
            </AnimatePresence>

            <Footer lang={lang} onShowModal={handleModalOpen} />
        </main>
    );
}

export default App;