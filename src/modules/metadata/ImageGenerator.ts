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
    ogName: string;
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
        ogName,
        tokenId
    }: GenerateOptions): Promise<string> {
        try {
            // Get font config for this group or use default
            const fontConfig = FONT_CONFIG[ogName] || FONT_CONFIG.default;
            
            // Load the font
            const fontPath = path.resolve(fontConfig.path);
            const fontData = await fs.readFile(fontPath);

            const imageResponse = new ImageResponse(
                React.createElement(
                    'div',
                    {
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: `url(${baseImageUrl})`,
                            backgroundSize: 'cover',
                            color: '#FFFFFF',
                            fontFamily: fontConfig.family
                        }
                    },
                    React.createElement(
                        'div',
                        {
                            style: {
                                fontSize: '64px',
                                textAlign: 'center',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                padding: '20px',
                                fontWeight: 'bold'
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

            // Store in blob storage
            const { url } = await put(
                `${ogName}/generated/${tokenId}.png`,
                Buffer.from(buffer),
                { access: 'public', addRandomSuffix: false }
            );

            return url;
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }
} 