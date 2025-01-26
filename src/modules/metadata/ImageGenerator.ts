import { ImageResponse } from 'next/server';
import { put } from '@vercel/blob';

interface GenerateOptions {
    baseImageUrl: string;
    fullAccountName: string;
    ogName: string;
    tokenId: string;
}

export class ImageGenerator {
    static async generate({
        baseImageUrl,
        fullAccountName,
        ogName,
        tokenId
    }: GenerateOptions): Promise<string> {
        try {
            const imageResponse = new ImageResponse(
                {
                    type: 'div',
                    props: {
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: `url(${baseImageUrl})`,
                            backgroundSize: 'cover',
                            color: '#FFFFFF'
                        },
                        children: [{
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '64px',
                                    textAlign: 'center',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                    padding: '20px',
                                    fontWeight: 'bold'
                                },
                                children: fullAccountName
                            }
                        }]
                    }
                },
                {
                    width: 1000,
                    height: 1000
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