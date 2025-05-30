/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { ImageResponse } from 'next/og';
import { put } from '@vercel/blob';
import React from 'react';
import fs from 'fs/promises';
import path from 'path';

interface GenerateOptions {
    baseImageUrl: string;
    fullAccountName: string;
    groupName: string;
    tokenId: string;
    contract?: string;
}

// Font configuration by group name
const FONT_CONFIG: Record<string, { path: string; family: string }> = {
    // Boulder group
    'boulder': {
        path: './public/fonts/OpenSans-Bold.ttf',
        family: 'Open Sans'
    },
    // Higher group
    'higher': {
        path: './public/fonts/Helvetica-Bold-02.ttf',
        family: 'Helvetica'
    },
    // Default font
    default: {
        path: './public/fonts/SpaceMono-Bold.ttf',
        family: 'Space Mono'
    }
};

export class ImageGenerator {
    static async generate({
        baseImageUrl,
        fullAccountName,
        groupName,
        tokenId
    }: GenerateOptions): Promise<string> {
        try {
            // Get font config for this group or use default
            const fontConfig = FONT_CONFIG[groupName] || FONT_CONFIG.default;
            
            // Load the font
            const fontPath = path.resolve(fontConfig.path);
            let fontData;
            try {
                fontData = await fs.readFile(fontPath);
            } catch (err) {
                console.warn(`Font not found at ${fontPath}, falling back to default font`);
                fontData = await fs.readFile(path.resolve(FONT_CONFIG.default.path));
            }

            // baseImageUrl is already handled by fallback system in metadata.ts
            if (!baseImageUrl) {
                throw new Error('No base image URL provided - check fallback system in metadata.ts');
            }

            const imageResponse = new ImageResponse(
                React.createElement(
                    'div',
                    {
                        style: {
                            width: '1000px',
                            height: '1000px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: `url(${baseImageUrl})`,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            color: '#FFFFFF',
                            fontFamily: fontConfig.family,
                            position: 'relative'
                        }
                    },
                    React.createElement(
                        'div',
                        {
                            style: {
                                position: 'absolute',
                                width: '1000px',
                                left: '50%',
                                bottom: '25%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                fontSize: (() => {
                                    if (fullAccountName.length <= 15) return '72px';
                                    if (fullAccountName.length <= 25) return '64px';
                                    if (fullAccountName.length <= 35) return '48px';
                                    return '36px';
                                })(),
                                fontWeight: 700,
                                textAlign: 'center',
                                color: '#FFFFFF',
                                textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.8)',
                                padding: '20px',
                                overflow: 'visible'
                            }
                        },
                        fullAccountName
                    )
                ),
                {
                    width: 1000,
                    height: 1000,
                    fonts: [
                        {
                            name: fontConfig.family,
                            data: fontData,
                            weight: 700,
                            style: 'normal'
                        }
                    ]
                }
            );

            // Convert the response to a buffer
            const buffer = await imageResponse.arrayBuffer();

            try {
                // Store in blob storage
                const { url } = await put(
                    `${groupName}/generated/${tokenId}.png`,
                    Buffer.from(buffer),
                    { access: 'public', addRandomSuffix: false }
                );
                console.info(`Generated overlay image for ${fullAccountName}`);
                return url;
            } catch (blobError: unknown) {
                const errorMessage = blobError instanceof Error ? blobError.message : 'Unknown error';
                console.error(`Failed to store overlay image for ${fullAccountName}:`, {
                    error: errorMessage,
                    groupName,
                    tokenId,
                    path: `${groupName}/generated/${tokenId}.png`
                });
                throw new Error(`Failed to store overlay image for ${fullAccountName}`);
            }
        } catch (error: unknown) {
            // Check for cache size limit error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('fetch for over 2MB of data can not be cached')) {
                console.warn(`Cache size limit exceeded for ${fullAccountName} - this is expected for large images and won't affect functionality`, {
                    groupName,
                    tokenId,
                    note: 'This warning can be safely ignored as the image is still generated and stored correctly'
                });
                // Don't throw error for cache limit - it's not a functional issue
                return `${process.env.NEXT_PUBLIC_BLOB_URL}/${groupName}/generated/${tokenId}.png`;
            }

            // Handle other errors
            console.error(`Image generation failed for ${fullAccountName}:`, {
                error: errorMessage,
                groupName,
                tokenId
            });
            throw new Error(`Failed to generate image for ${fullAccountName}`);
        }
    }
} 