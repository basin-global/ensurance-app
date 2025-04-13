'use client'

import { useState, useEffect, forwardRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import AccountImage from '@/modules/accounts/AccountImage'
import AccountStats from '@/modules/accounts/AccountStats'
import { cn } from '@/lib/utils'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { useRouter } from 'next/navigation'

interface Account {
    full_account_name: string;
    token_id: number;
    group_name: string;
    is_agent: boolean;
    stock_or_flow: string | null;
    display_name: string | null;
    total_currency_value: number;
    total_assets: number;
    ensured_assets: number;
    stats_last_updated?: string;
}

interface NaturalCapitalItem {
    id: string;
    name: string;
    description?: string;
    image?: string;
    url: string;
    group_name: string;
}

interface NaturalCapitalGridProps {
    groupName?: string;
    searchQuery?: string;
    activeCategory: 'all' | 'stock' | 'flow';
    urlPrefix?: string;
    variant?: 'showcase' | 'detailed' | 'standard';
    showHeader?: boolean;
}

interface CircleItemProps {
    account: Account;
    groupName: string;
    urlPrefix: string;
    variant?: 'showcase' | 'detailed' | 'standard';
}

const CircleItem = forwardRef<HTMLAnchorElement, CircleItemProps>(({ 
    account, 
    groupName, 
    urlPrefix,
    variant = 'showcase'
}, ref) => {
    const displayName = account.display_name || account.full_account_name;
    
    return (
        <Link 
            ref={ref}
            href={`/${account.full_account_name}`}
            className={cn(
                "circle-item group",
                variant === 'detailed' && "detailed"
            )}
            data-type={account.stock_or_flow || 'unknown'}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="circle-content"
            >
                <AccountImage
                    tokenId={account.token_id}
                    groupName={groupName}
                    variant="square"
                    className="circle-image"
                />
                <div className="circle-overlay">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-sm text-white font-medium px-4 text-center">
                            {displayName}
                        </span>
                        {variant === 'detailed' && (
                            <AccountStats
                                total_currency_value={account.total_currency_value}
                                total_assets={account.total_assets}
                                ensured_assets={account.ensured_assets}
                            />
                        )}
                    </div>
                </div>
            </motion.div>
        </Link>
    );
});

export default function NaturalCapitalGrid({ 
    groupName = 'ensurance', 
    searchQuery = '', 
    activeCategory = 'all',
    urlPrefix = '',
    variant = 'standard',
    showHeader = true
}: NaturalCapitalGridProps) {
    const router = useRouter()
    const [localCategory, setLocalCategory] = useState(activeCategory)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Update local category when prop changes
    useEffect(() => {
        setLocalCategory(activeCategory)
    }, [activeCategory])

    const words = [
        { text: "natural capital" },
        { text: "biodiversity" },
        { text: "ecosystems" },
        { text: "nature" },
        { text: "ecosystem services" }
    ]

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch(`/api/accounts?group=${groupName}`)
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                
                // Filter out situs.ensurance if this is the ensurance group
                const filteredAccounts = data.filter(account => 
                    account.full_account_name !== 'situs.ensurance'
                )
                
                const sortedAccounts = filteredAccounts.sort((a, b) => {
                    const aName = a.display_name || a.full_account_name;
                    const bName = b.display_name || b.full_account_name;
                    return aName.localeCompare(bName);
                });
                
                setAccounts(sortedAccounts)
            } catch (err) {
                console.error('Error fetching accounts:', err)
                setError('Failed to load natural capital data')
            } finally {
                setLoading(false)
            }
        }

        fetchAccounts()
    }, [groupName])

    const filteredAccounts = accounts
        .filter(account => {
            // If there's a search query, only filter by search
            if (searchQuery) {
                const displayName = (account.display_name || account.full_account_name).toLowerCase();
                return displayName.includes(searchQuery.toLowerCase());
            }
            // If no search query, filter by category
            if (localCategory === 'all') return true;
            return account.stock_or_flow === localCategory;
        });

    return (
        <motion.div 
            className={cn(
                "natural-capital-section",
                variant === 'standard' && "py-4",
                variant === 'detailed' && "py-8",
                variant === 'showcase' && "py-16"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {showHeader && variant === 'showcase' && (
                <div className="text-center space-y-8 mb-24">
                    <p className="text-2xl tracking-wider text-white/80">ensuring</p>
                    <Link href="/natural-capital" className="block group space-y-8">
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/80 group-hover:opacity-80 transition-opacity">
                            critical infrastructure
                        </h2>
                        <div className="h-16">
                            <TypewriterEffect words={words} className="justify-center group-hover:opacity-80 transition-opacity" />
                        </div>
                    </Link>
                    <div className="flex justify-center gap-16 mt-8 text-lg tracking-widest">
                        <button 
                            onClick={() => setLocalCategory('stock')}
                            className={cn(
                                "transition-colors duration-300 relative uppercase",
                                localCategory === 'stock' ? "text-white" : "text-white/40 hover:text-white/60"
                            )}
                            disabled={loading}
                        >
                            Stocks
                            {localCategory === 'stock' && (
                                <motion.div 
                                    layoutId="underline"
                                    className="absolute -bottom-2 left-0 right-0 h-px bg-white"
                                />
                            )}
                        </button>
                        <button 
                            onClick={() => setLocalCategory('flow')}
                            className={cn(
                                "transition-colors duration-300 relative uppercase",
                                localCategory === 'flow' ? "text-white" : "text-white/40 hover:text-white/60"
                            )}
                            disabled={loading}
                        >
                            Flows
                            {localCategory === 'flow' && (
                                <motion.div 
                                    layoutId="underline"
                                    className="absolute -bottom-2 left-0 right-0 h-px bg-white"
                                />
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className={cn(
                "max-w-[1200px] mx-auto",
                variant === 'standard' ? "px-4" : "px-[30px]"
            )}>
                {loading ? (
                    <div className="circle-grid">
                        {[...Array(8)].map((_, index) => (
                            <div key={index} className="circle-item">
                                <div className="circle-content animate-pulse bg-gray-800/50">
                                    <div className="absolute inset-0 rounded-full bg-gray-700/30" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center py-12">{error}</div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="text-white text-center py-12">No accounts found for the selected filter</div>
                ) : (
                    <div className="circle-grid">
                        <AnimatePresence mode="popLayout">
                            {filteredAccounts.map((account) => (
                                <CircleItem 
                                    key={account.token_id}
                                    account={account}
                                    groupName={groupName}
                                    urlPrefix={urlPrefix}
                                    variant={variant}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <style jsx global>{`
                :root {
                    --item-size: 180px;
                    --grid-gap: 30px;
                }

                .natural-capital-section {
                    position: relative;
                    padding: ${variant === 'showcase' ? '60px 0 120px' : variant === 'detailed' ? '30px 0 60px' : '0'};
                    background: ${variant !== 'standard' ? `
                        linear-gradient(180deg, 
                            rgba(0, 0, 0, 0) 0%,
                            rgba(255, 255, 255, 0.03) 5%,
                            rgba(255, 255, 255, 0.05) 15%,
                            rgba(255, 255, 255, 0.05) 85%,
                            rgba(255, 255, 255, 0.03) 95%,
                            rgba(0, 0, 0, 0) 100%
                        ),
                        linear-gradient(90deg,
                            rgba(0, 0, 0, 0) 0%,
                            rgba(255, 255, 255, 0.02) 25%,
                            rgba(255, 255, 255, 0.02) 75%,
                            rgba(0, 0, 0, 0) 100%
                        )
                    ` : 'none'};
                }

                .natural-capital-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 10%;
                    right: 10%;
                    height: 1px;
                    background: linear-gradient(90deg,
                        transparent,
                        rgba(255, 255, 255, 0.15) 20%,
                        rgba(255, 255, 255, 0.15) 80%,
                        transparent
                    );
                    display: ${variant === 'standard' ? 'none' : 'block'};
                }

                .circle-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(var(--item-size), 1fr));
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 var(--grid-gap);
                    gap: var(--grid-gap);
                }

                .circle-item {
                    aspect-ratio: 1;
                    position: relative;
                }

                .circle-content {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    border-radius: 50%;
                    overflow: hidden;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .circle-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    filter: saturate(0.95);
                }

                .circle-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to top,
                        rgba(0, 0, 0, 0.75) 0%,
                        rgba(0, 0, 0, 0.3) 40%,
                        rgba(0, 0, 0, 0) 100%
                    );
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    padding: 0 0.75rem 1.25rem;
                    opacity: 0.6;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .circle-overlay span {
                    font-size: 1rem;
                    line-height: 1.4;
                    max-width: 90%;
                    text-align: center;
                    word-wrap: normal;
                    word-break: normal;
                    hyphens: none;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                }

                [data-type="stock"] .circle-content {
                    box-shadow: 
                        inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                        0 4px 20px rgba(0, 0, 0, 0.1);
                }

                [data-type="flow"] .circle-content {
                    box-shadow: 
                        inset 0 0 0 1px rgba(255, 255, 255, 0.15),
                        0 4px 20px rgba(0, 0, 0, 0.15);
                }

                .circle-item:hover .circle-content {
                    transform: scale(1.02);
                    box-shadow: 
                        inset 0 0 0 1px rgba(255, 255, 255, 0.2),
                        0 8px 32px rgba(0, 0, 0, 0.2);
                }

                .circle-item:hover .circle-image {
                    transform: scale(1.05);
                    filter: saturate(1.1) brightness(1.05);
                }

                .circle-item:hover .circle-overlay {
                    opacity: 0.8;
                    background: linear-gradient(
                        to top,
                        rgba(0, 0, 0, 0.8) 0%,
                        rgba(0, 0, 0, 0.4) 50%,
                        rgba(0, 0, 0, 0) 100%
                    );
                }

                .circle-item:hover .circle-overlay span {
                    font-weight: 500;
                    transform: translateY(-4px);
                }

                .circle-item.detailed .circle-overlay {
                    padding-bottom: 2rem;
                }

                .circle-item.detailed:hover .circle-overlay {
                    opacity: 0.9;
                    background: linear-gradient(
                        to top,
                        rgba(0, 0, 0, 0.9) 0%,
                        rgba(0, 0, 0, 0.5) 60%,
                        rgba(0, 0, 0, 0) 100%
                    );
                }

                @media (max-width: 900px) {
                    :root {
                        --item-size: 160px;
                        --grid-gap: 25px;
                    }
                }

                @media (max-width: 600px) {
                    :root {
                        --item-size: 140px;
                        --grid-gap: 20px;
                    }
                }
            `}</style>
        </motion.div>
    )
} 