/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { STYLES, t } from '../lib/albumUtils';
import type { StyleKey } from '../lib/albumUtils';
import { LoadingSpinner, DownloadIcon, RegenerateIcon, DiscardIcon, CheckIcon, ErrorIcon } from './ui/draggable-card';

// --- Style Selection Card ---

interface StyleCardProps {
    styleKey: StyleKey;
    isSelected: boolean;
    onToggle: (styleKey: StyleKey) => void;
    lang: 'en' | 'ar';
}

export const StyleCard: React.FC<StyleCardProps> = ({ styleKey, isSelected, onToggle, lang }) => {
    const styleName = t(lang, `style_${styleKey}_name` as any);
    const styleDesc = t(lang, `style_${styleKey}_desc` as any);

    return (
        <div
            onClick={() => onToggle(styleKey)}
            className={cn(
                "relative cursor-pointer p-4 rounded-2xl border transition-all duration-300 ease-in-out group w-full flex items-center justify-between",
                isSelected ? "border-transparent bg-white ring-2 ring-[#006C35] shadow-md shadow-[#006C35]/10" : "border-neutral-200/80 bg-white hover:border-neutral-400 hover:shadow-lg"
            )}
        >
            <div className="flex-1">
                 <h3 className="font-bold text-base leading-tight text-[#1C1C1C]">{styleName}</h3>
                 <p className="text-sm text-neutral-500 mt-1">{styleDesc}</p>
            </div>
             <div className="relative ltr:ml-4 rtl:mr-4">
                <div className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-in-out",
                    isSelected ? "border-[#006C35] bg-[#006C35]" : "border-neutral-300 bg-neutral-100 group-hover:border-neutral-400"
                )}>
                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
            </div>
        </div>
    );
};


// --- Headshot Result Card ---

type ImageStatus = 'pending' | 'done' | 'error' | 'discarded';

interface HeadshotCardProps {
    styleKey: StyleKey;
    status: ImageStatus;
    imageUrl?: string;
    error?: string;
    onRegenerate: () => void;
    onDiscard: () => void;
    lang: 'en' | 'ar';
}

const ActionButton = ({ onClick, 'aria-label': ariaLabel, children }: { onClick: () => void, 'aria-label': string, children: React.ReactNode }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="p-3 bg-black/50 rounded-full text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white transition-all hover:scale-110"
    >
        {children}
    </button>
);


export const HeadshotCard: React.FC<HeadshotCardProps> = ({ styleKey, status, imageUrl, error, onRegenerate, onDiscard, lang }) => {
    
    const handleDownload = () => {
        if (imageUrl) {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `Egal-Headshot-${styleKey}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const styleName = t(lang, `style_${styleKey}_name` as any);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-white rounded-3xl p-3 flex flex-col gap-3 border border-neutral-200/80"
        >
            <motion.div 
                whileHover={status === 'done' ? { y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' } : {}}
                className="relative w-full aspect-square rounded-2xl overflow-hidden group bg-neutral-100 shadow-inner"
            >
                {status === 'pending' && (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                    </div>
                )}
                 {status === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <ErrorIcon className="h-12 w-12 text-red-500 mb-2" />
                        <p className="text-sm font-bold text-red-600">{t(lang, 'generationFailed')}</p>
                        <p className="text-xs text-neutral-500 mt-1 max-w-[90%]">{error}</p>
                    </div>
                )}
                {status === 'done' && imageUrl && (
                     <>
                        <motion.img
                            key={imageUrl}
                            src={imageUrl}
                            alt={styleName}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 transition-opacity opacity-0 group-hover:opacity-100 duration-300">
                             <ActionButton onClick={handleDownload} aria-label={t(lang, 'downloadButton')}>
                                <DownloadIcon className="w-5 h-5"/>
                            </ActionButton>
                            <ActionButton onClick={onRegenerate} aria-label={t(lang, 'regenerateButton')}>
                                <RegenerateIcon className="w-5 h-5"/>
                            </ActionButton>
                             <ActionButton onClick={onDiscard} aria-label={t(lang, 'discardButton')}>
                                <DiscardIcon className="w-5 h-5"/>
                            </ActionButton>
                        </div>
                    </>
                )}
            </motion.div>
             <div className="flex items-center justify-between px-1">
                <p className="font-bold text-base text-[#1C1C1C]">{styleName}</p>
                {status === 'error' && (
                    <button onClick={onRegenerate} className="text-sm font-bold text-[#006C35] hover:underline">
                        {t(lang, 'tryAgainButton')}
                    </button>
                )}
            </div>
        </motion.div>
    );
};