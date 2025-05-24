'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // DialogDescription, // Removed as it's unused (commented out in JSX)
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Assuming Input is also a Shadcn component or we use a standard one
import { Button } from "@/components/ui/button"; // Assuming Button is also a Shadcn component
import { ShareIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

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
            // Optionally, show an error message to the user
        }
    };

    const shareData = {
        title: 'Lambro Radio - ' + title,
        text: 'Check out this retuned track on Lambro Radio!',
        url: url
    };

    const handleNativeShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback or message if navigator.share is not supported
                console.log('Web Share API not supported, copy the link instead.');
            }
        } catch (err) {
            console.log('Error sharing:', err);
        }
    };

    // Note: The Shadcn Dialog controls its open state via an `open` prop and `onOpenChange` callback.
    // We are passing `isOpen` and `onClose` to align with how it might be controlled from Player.tsx.
    // The actual <Dialog open={isOpen} onOpenChange={onClose}> would be ideal.

    if (!isOpen) return null; // Still needed if Dialog isn't controlling its own visibility via props from parent

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-apple-bg-secondary border-apple-border-primary text-apple-text-primary sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-apple-text-primary flex items-center">
                        <ShareIcon className="w-5 h-5 mr-2 text-apple-accent-blue" />
                        Share Track
                    </DialogTitle>
                    {/* <DialogDescription className="text-apple-text-secondary">
                        Share this tuned audio with others.
                    </DialogDescription> */} 
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-2">
                        <Input
                            type="text"
                            value={url}
                            readOnly
                            className="bg-apple-bg-tertiary border-apple-border-secondary text-apple-text-primary placeholder-apple-text-tertiary focus-visible:ring-apple-accent-blue"
                            aria-label="Shareable URL"
                        />
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={handleCopy}
                            aria-label="Copy URL"
                        >
                            <DocumentDuplicateIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    {copied && (
                        <p className="text-sm text-apple-accent-green text-center">Link copied to clipboard!</p>
                    )}

                    {typeof navigator.share === 'function' && (
                        <Button 
                            variant="default" 
                            className="w-full"
                            onClick={handleNativeShare}
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            Share via...
                        </Button>
                    )}
                </div>
                
                <DialogFooter className="gap-2 sm:justify-start">
                    {/* <Button 
                        variant="default" 
                        size="default" 
                        onClick={handleDownloadQrCode} 
                    /> */}
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShareDialog;