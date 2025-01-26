'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import AccountImage from '@/modules/accounts/AccountImage'
import { cn } from '@/lib/utils'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'

interface Account {
    full_account_name: string;
    token_id: number;
    og_name: string;
    is_agent: boolean;
    pool_type: string | null;
    display_name: string | null;
}

interface NaturalCapitalGridProps {
    groupName?: string;
    searchQuery?: string;
    activeCategory: 'all' | 'stocks' | 'flows';
    urlPrefix?: string;
}

const CircleItem = ({ account, groupName, urlPrefix }: { 
    account: Account; 
    groupName: string;
    urlPrefix: string;
}) => {
    const displayName = account.display_name || account.full_account_name;
    
    return (
        <Link 
            href={`${urlPrefix}/${account.full_account_name}`}
            className="circle-item group"
            data-type={account.pool_type || 'unknown'}
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
                    <span className="text-sm text-white font-medium px-4 text-center">
                        {displayName}
                    </span>
                </div>
            </motion.div>
        </Link>
    );
};

export default function NaturalCapitalGrid({ 
    groupName = 'ensurance', 
    searchQuery = '', 
    activeCategory: initialCategory = 'all',
    urlPrefix = ''
}: NaturalCapitalGridProps) {
    const [category, setCategory] = useState<'all' | 'stocks' | 'flows'>(initialCategory)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const words = [
        { text: "natural capital" },
        { text: "biodiversity" },
        { text: "nature" },
        { text: "ecosystems" }
    ]

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch('/api/accounts')
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                
                const filteredAccounts = data.filter(account => 
                    account.og_name === `.${groupName}` && 
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
            if (category === 'all') return true;
            return account.pool_type === (category === 'stocks' ? 'stock' : 'flow');
        })
        .filter(account => {
            if (!searchQuery) return true;
            const displayName = (account.display_name || account.full_account_name).toLowerCase();
            return displayName.includes(searchQuery.toLowerCase());
        });

    return (
        <motion.div 
            className="natural-capital-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center space-y-8 mb-24">
                <p className="text-2xl tracking-wider text-white/80">ensuring</p>
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/80">
                    critical infrastructure
                </h2>
                <div className="h-16">
                    <TypewriterEffect words={words} className="justify-center" />
                </div>
                <div className="flex justify-center gap-16 mt-8 text-lg tracking-widest">
                    <button 
                        onClick={() => setCategory('stocks')}
                        className={cn(
                            "transition-colors duration-300 relative uppercase",
                            category === 'stocks' ? "text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        Stocks
                        {category === 'stocks' && (
                            <motion.div 
                                layoutId="underline"
                                className="absolute -bottom-2 left-0 right-0 h-px bg-white"
                            />
                        )}
                    </button>
                    <button 
                        onClick={() => setCategory('flows')}
                        className={cn(
                            "transition-colors duration-300 relative uppercase",
                            category === 'flows' ? "text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        Flows
                        {category === 'flows' && (
                            <motion.div 
                                layoutId="underline"
                                className="absolute -bottom-2 left-0 right-0 h-px bg-white"
                            />
                        )}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-white text-center py-12">Loading natural capital data...</div>
            )}
            
            {error && (
                <div className="text-red-500 text-center py-12">{error}</div>
            )}
            
            {!loading && !error && filteredAccounts.length === 0 && (
                <div className="text-white text-center py-12">No accounts found for the selected filter</div>
            )}
            
            {!loading && !error && filteredAccounts.length > 0 && (
                <div className="circle-grid">
                    <AnimatePresence mode="popLayout">
                        {filteredAccounts.map((account) => (
                            <CircleItem 
                                key={account.token_id}
                                account={account}
                                groupName={groupName}
                                urlPrefix={urlPrefix}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <style jsx global>{`
                :root {
                    --item-size: 180px;
                    --grid-gap: 30px;
                }

                .natural-capital-section {
                    position: relative;
                    padding: 60px 0 120px;
                    background: 
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
                        );
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
                    font-size: 0.8rem;
                    line-height: 1.3;
                    max-width: 80%;
                    text-align: center;
                    word-wrap: break-word;
                    word-break: break-word;
                    hyphens: auto;
                    font-weight: normal;
                    transition: all 0.3s ease;
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