'use client';

import { useState, useEffect } from 'react';
import { ShareIcon, DocumentDuplicateIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

const ShareDialog = ({ isOpen, onClose, url, title }: ShareDialogProps) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (!isOpen) return null;

    const shareData = {
        title: 'Lambro Radio - ' + title,
        text: 'Check out this retuned track on Lambro Radio!',
        url: url
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            }
        } catch (err) {
            console.log('Error sharing:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                
                <h3 className="text-xl font-semibold text-white mb-4">Share this track</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2">
                        <input
                            type="text"
                            value={url}
                            readOnly
                            className="flex-1 bg-transparent text-white text-sm outline-none"
                        />
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            title="Copy link"
                        >
                            <DocumentDuplicateIcon className="w-5 h-5 text-indigo-400" />
                        </button>
                    </div>

                    {navigator.share && (
                        <button
                            onClick={handleShare}
                            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-3 transition-colors"
                        >
                            <ShareIcon className="w-5 h-5" />
                            <span>Share</span>
                        </button>
                    )}
                </div>

                {copied && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm">
                        Link copied!
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareDialog;