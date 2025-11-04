/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { t } from '../lib/albumUtils';

type ModalContentType = 'privacy' | 'terms';

const Footer = ({ lang, onShowModal }: { lang: 'en' | 'ar', onShowModal: (contentType: ModalContentType) => void }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-[#F9F9F9]/80 backdrop-blur-sm p-3 z-50 text-neutral-500 text-xs sm:text-sm border-t border-neutral-200/80">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 px-4">
                <p className="text-center sm:text-left">
                    {t(lang, 'footerCopyright')}
                </p>
                 <div className="flex items-center gap-x-4">
                    <button onClick={() => onShowModal('privacy')} className="hover:text-[#1C1C1C] transition-colors">{t(lang, 'privacyPolicy')}</button>
                    <span className="text-neutral-300">|</span>
                    <button onClick={() => onShowModal('terms')} className="hover:text-[#1C1C1C] transition-colors">{t(lang, 'termsOfService')}</button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;