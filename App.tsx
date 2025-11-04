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
import { EgalLogo, CloseIcon } from './components/ui/draggable-card';

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

const Header = ({ lang, setLang, appState }: { lang: 'en' | 'ar', setLang: (lang: 'en' | 'ar') => void, appState: AppState }) => {
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
                <div className={`text-2xl font-bold text-[#1C1C1C] transition-opacity duration-300 ${appState === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                    <EgalLogo lang={lang} />
                </div>
                <button
                    onClick={toggleLang}
                    className="font-bold text-sm border-2 border-neutral-300 text-[#1C1C1C] rounded-full px-4 py-1 hover:bg-[#1C1C1C] hover:text-white transition-colors duration-300"
                    aria-label={t(lang, 'toggleLanguage')}
                >
                    {lang === 'en' ? 'AR' : 'EN'}
                </button>
            </motion.div>
        </header>
    );
};

const Modal = ({ lang, contentKey, onClose }: { lang: 'en' | 'ar', contentKey: ModalContentType, onClose: () => void }) => {
    const title = t(lang, `${contentKey}Title` as any);
    const content = t(lang, `${contentKey}Content` as any);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

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
                className="relative bg-[#F9F9F9] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-neutral-200/80"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-neutral-200">
                    <h2 className="text-xl font-bold text-[#1C1C1C]">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors" aria-label="Close">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 text-[#1C1C1C]/80 leading-relaxed whitespace-pre-wrap">
                    {content}
                </div>
            </motion.div>
        </motion.div>
    );
};

function App() {
    const [lang, setLang] = useState<'en' | 'ar'>('en');
    const [appState, setAppState] = useState<AppState>('idle');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [selectedStyles, setSelectedStyles] = useState<StyleKey[]>([]);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContentType | null>(null);

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);
    
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
        setSelectedStyles(prev =>
            prev.includes(styleKey) ? prev.filter(k => k !== styleKey) : [...prev, styleKey]
        );
    };
    
    const handleSelectAllToggle = () => {
        if (selectedStyles.length === allStyleKeys.length) {
            setSelectedStyles([]);
        } else {
            setSelectedStyles(allStyleKeys);
        }
    };

    const runGeneration = useCallback(async (stylesToGenerate: StyleKey[]) => {
        if (!uploadedImage) return;

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

    }, [uploadedImage, lang]);


    const handleGenerateClick = async () => {
        if (selectedStyles.length === 0) return;
        setAppState('generating');
        await runGeneration(selectedStyles);
        setAppState('results');
    };

    const handleRegenerate = async (key: StyleKey) => {
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
        return Object.values(generatedImages).some(image => image.status === 'done' || image.status === 'error');
    }, [generatedImages]);

    const isGenerating = appState === 'generating' || (appState === 'results' && generationProgress < 1 && generationProgress > 0);
    const allStyleKeys = Object.keys(STYLES) as StyleKey[];

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
            <Header lang={lang} setLang={setLang} appState={appState} />

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
                        <p className="text-neutral-500 mt-2 text-center">{t(lang, 'selectStylesSub')}</p>

                        <div className="mt-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-1 flex flex-col items-center gap-4 p-4 rounded-3xl bg-white shadow-sm border border-neutral-200/80 lg:sticky top-24">
                                <img src={uploadedImage} alt={t(lang, 'yourPortrait')} className="rounded-2xl w-full max-w-[250px] aspect-square object-cover" />
                                 <button onClick={handleStartOver} className={`${secondaryButtonClasses} w-full text-sm py-2 px-4`}>
                                    {t(lang, 'changePhotoButton')}
                                </button>
                             </div>
                             
                             <div className="lg:col-span-2 flex flex-col gap-3">
                                {allStyleKeys.map(key => (
                                    <StyleCard key={key} styleKey={key} isSelected={selectedStyles.includes(key)} onToggle={handleStyleToggle} lang={lang} />
                                ))}
                             </div>
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-4">
                            <button onClick={handleGenerateClick} className={primaryButtonClasses} disabled={selectedStyles.length === 0}>
                                {t(lang, 'generateButton')} ({selectedStyles.length})
                            </button>
                            <button onClick={handleSelectAllToggle} className="font-medium text-sm text-neutral-600 cursor-pointer hover:text-[#006C35] transition-colors">
                                {selectedStyles.length === allStyleKeys.length ? t(lang, 'deselectAll') : t(lang, 'selectAll')}
                            </button>
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
                                        disabled={isGenerating || !canRegenerateAll}
                                    >
                                        {t(lang, 'regenerateAllButton')}
                                    </button>
                                    <button onClick={handleStartOver} className={primaryButtonClasses} disabled={isGenerating}>
                                        {t(lang, 'startOverButton')}
                                    </button>
                                </div>
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

            <Footer lang={lang} onShowModal={handleModalOpen} />
        </main>
    );
}

export default App;