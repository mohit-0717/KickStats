import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PulseAiMark from './PulseAiMark';

const MAX_VISIBLE_FIELDS = 4;
const AI_SERVICE_BASE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '');
const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:9090/FootballBackendAPI').replace(/\/$/, '');

const formatAssistantError = (message) => {
    const fallback = 'Pulse AI could not ground that answer in the live football database. Try a clearer stat, fixture, or transfer query.';

    if (!message) {
        return fallback;
    }

    if (message.toLowerCase().includes('invalid query') || message.toLowerCase().includes('sql error')) {
        return 'The scout found a schema mismatch while building that answer. Try a simpler football stat or inspect the interpreted query.';
    }

    if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('quota')) {
        return 'The assistant is cooling down after a burst of requests. Wait a moment, then send again.';
    }

    if (message.toLowerCase().includes('cerebras api error') || message.toLowerCase().includes('groq api error')) {
        return 'The AI provider is temporarily unavailable. Try again in a moment.';
    }

    return message;
};

const formatLabel = (value) => value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createUserMessage = (text) => ({
    id: createId(),
    role: 'user',
    kind: 'text',
    text
});

const createTypingMessage = () => ({
    id: createId(),
    role: 'ai',
    kind: 'typing'
});

const createAiMessage = (kind, payload) => ({
    id: createId(),
    role: 'ai',
    kind,
    ...payload
});

const getContextMeta = (pathname) => {
    if (pathname.startsWith('/matches/')) {
        return {
            label: 'Match Detail',
            opener: 'I can break down the fixture, events, and referee pulse from here.',
            suggestions: [
                'Summarize the match momentum',
                'Who changed the game here?',
                'Explain the referee profile'
            ]
        };
    }

    if (pathname === '/match-center') {
        return {
            label: 'Match Center',
            opener: 'I can read live fixtures, form swings, and team comparison data from Match Center.',
            suggestions: [
                'Top fixture by pressure',
                'Which team looks strongest today?',
                'Show referee strictness leaders'
            ]
        };
    }

    if (pathname.startsWith('/players/')) {
        return {
            label: 'Player Detail',
            opener: 'I can scout the player, compare output, and translate form into a cleaner read.',
            suggestions: [
                'Is he in good form?',
                'Compare his goal involvements',
                'Show latest transfer context'
            ]
        };
    }

    if (pathname === '/portals') {
        return {
            label: 'Portals',
            opener: 'I can move between player intelligence, club depth, medical notes, and market signals.',
            suggestions: [
                'Top scorers under 23',
                'Current injury list',
                'Top clubs by latest transfer fees'
            ]
        };
    }

    if (pathname === '/fan-cave') {
        return {
            label: 'Fan Cave',
            opener: 'I can help interpret follows, alerts, and the league control room from Fan Cave.',
            suggestions: [
                'Show current fan alerts',
                'Most followed teams',
                'Latest injury watch'
            ]
        };
    }

    return {
        label: 'Landing',
        opener: 'Hey, I’m Pulse AI. Ask me anything about matches, players, transfers, or stadiums.',
        suggestions: [
            'Top scorers',
            'Best stadiums by capacity',
            'Latest transfer fees',
            'Current top 3 teams'
        ]
    };
};

const getDynamicSuggestions = (query, pathname) => {
    const normalized = query.toLowerCase();

    if (normalized.includes('transfer') || normalized.includes('value') || normalized.includes('fee')) {
        return [
            'Show the top 5 players by latest transfer fee',
            'List the biggest recent transfer fees',
            'Which under-23 players have the biggest fees?'
        ];
    }

    if (normalized.includes('goal') || normalized.includes('assist') || normalized.includes('contribution')) {
        return [
            'Top scorers under 23',
            'Show players with more than 5 goal involvements',
            'Who has the most assists?'
        ];
    }

    if (normalized.includes('injury') || normalized.includes('medical')) {
        return [
            'Who is currently injured?',
            'Show the next expected returns',
            'Which clubs have the biggest injury list?'
        ];
    }

    return getContextMeta(pathname).suggestions;
};

const inferInterpretedQuery = (query) => {
    const normalized = query.trim().toLowerCase();

    if (normalized.includes('market value') || normalized.includes('valuable')) {
        return query.replace(/market value|valuable/gi, 'latest transfer fee');
    }

    if (normalized.includes('scrores') || normalized.includes('scorres')) {
        return query.replace(/scrores|scorres/gi, 'scorers');
    }

    return query;
};

const renderDataCards = (rows) => rows.map((row) => {
    const entries = Object.entries(row);
    const titleEntry = entries.find(([key]) => /(name|player_name|team_name|stadium_name)/i.test(key)) ?? entries[0];
    const secondaryEntries = entries
        .filter(([key]) => key !== titleEntry?.[0])
        .slice(0, MAX_VISIBLE_FIELDS);

    return {
        id: createId(),
        title: titleEntry ? String(titleEntry[1] ?? '') : 'Record',
        fields: secondaryEntries.map(([key, value]) => ({
            key,
            label: formatLabel(key),
            value: String(value ?? '')
        }))
    };
});

const PulseAssistant = () => {
    const location = useLocation();
    const contextMeta = useMemo(() => getContextMeta(location.pathname), [location.pathname]);
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState(() => ([
        createAiMessage('intro', {
            title: 'Pulse AI',
            text: contextMeta.opener,
            suggestions: contextMeta.suggestions
        })
    ]));
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const [lastQuery, setLastQuery] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [chipSuggestions, setChipSuggestions] = useState(contextMeta.suggestions);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages([
            createAiMessage('intro', {
                title: 'Pulse AI',
                text: contextMeta.opener,
                suggestions: contextMeta.suggestions
            })
        ]);
        setChipSuggestions(contextMeta.suggestions);
    }, [contextMeta]);

    useEffect(() => {
        const handleExternalOpen = () => {
            setIsOpen(true);
        };

        window.addEventListener('pulse-assistant:open', handleExternalOpen);
        return () => window.removeEventListener('pulse-assistant:open', handleExternalOpen);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const inlineSuggestions = useMemo(() => {
        if (!input.trim()) {
            return chipSuggestions;
        }

        return getDynamicSuggestions(input, location.pathname)
            .filter((suggestion) => suggestion.toLowerCase().includes(input.trim().toLowerCase()) || input.trim().length < 6)
            .slice(0, 4);
    }, [chipSuggestions, input, location.pathname]);

    const appendMessages = (newMessages) => {
        setMessages((current) => [...current, ...newMessages]);
    };

    const replaceTypingMessage = (nextMessages) => {
        setMessages((current) => {
            const withoutTyping = current.filter((message) => message.kind !== 'typing');
            return [...withoutTyping, ...nextMessages];
        });
    };

    const handleCopy = async (messageId, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            window.setTimeout(() => setCopiedMessageId(null), 1200);
        } catch {
            setCopiedMessageId(null);
        }
    };

    const handlePrompt = async (rawQuery) => {
        const query = rawQuery.trim();
        if (!query || loading || cooldown) {
            return;
        }

        setLoading(true);
        setCooldown(true);
        setLastQuery(query);
        setInput('');

        const interpretedQuery = inferInterpretedQuery(query);
        appendMessages([
            createUserMessage(query),
            ...(interpretedQuery !== query
                ? [createAiMessage('rewrite', { text: interpretedQuery })]
                : []),
            createTypingMessage()
        ]);

        try {
            const aiResponse = await fetch(`${AI_SERVICE_BASE_URL}/ai/pulse-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: interpretedQuery })
            });
            const aiPayload = await aiResponse.json();

            if (!aiResponse.ok) {
                throw new Error(aiPayload.detail || aiPayload.error || 'Failed to generate response');
            }

            const responseType = aiPayload.type ?? aiPayload.response_type;
            const payload = aiPayload.payload ?? '';

            if (responseType === 'narrative') {
                setChipSuggestions(getDynamicSuggestions(interpretedQuery, location.pathname));
                replaceTypingMessage([
                    createAiMessage('text', {
                        title: 'Scout Voice',
                        text: payload,
                        actions: getDynamicSuggestions(interpretedQuery, location.pathname)
                    })
                ]);
                return;
            }

            const generatedSql = aiPayload.generated_sql ?? payload;
            const dbResponse = await fetch(`${BACKEND_BASE_URL}/api/ai/execute-sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: generatedSql })
            });
            const dbPayload = await dbResponse.json();

            if (!dbResponse.ok) {
                throw new Error(dbPayload.error || 'The AI generated an invalid query for this schema.');
            }

            let summaryText = '';
            if (Array.isArray(dbPayload) && dbPayload.length > 0) {
                const summaryResponse = await fetch(`${AI_SERVICE_BASE_URL}/ai/summarize-results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: interpretedQuery,
                        data: dbPayload
                    })
                });
                const summaryPayload = await summaryResponse.json();
                if (summaryResponse.ok) {
                    summaryText = summaryPayload.summary ?? '';
                }
            }

            const nextMessages = [];

            if (summaryText) {
                nextMessages.push(createAiMessage('insight', {
                    title: 'Insight',
                    text: summaryText
                }));
            }

            nextMessages.push(createAiMessage('data', {
                title: 'Data Cards',
                cards: renderDataCards(Array.isArray(dbPayload) ? dbPayload : []),
                sql: generatedSql
            }));
            setChipSuggestions(getDynamicSuggestions(interpretedQuery, location.pathname));

            replaceTypingMessage(nextMessages);
        } catch (requestError) {
            setChipSuggestions([]);
            replaceTypingMessage([
                createAiMessage('error', {
                    title: 'System Error',
                    text: formatAssistantError(requestError.message || 'Neural link timeout.')
                })
            ]);
        } finally {
            setLoading(false);
            window.setTimeout(() => setCooldown(false), 3000);
        }
    };

    return (
        <div className="pulse-assistant">
            {isOpen && (
                <div className="pulse-assistant-panel pulse-chat-shell">
                    <div className="pulse-assistant-head pulse-chat-head">
                        <div className="pulse-assistant-title">
                            <PulseAiMark size="sm" glow animated />
                            <span>Pulse AI</span>
                        </div>
                        <button type="button" className="pulse-assistant-close" onClick={() => setIsOpen(false)}>x</button>
                    </div>

                    <div className="pulse-chat-history">
                        {messages.map((message) => {
                            if (message.kind === 'typing') {
                                return (
                                    <div key={message.id} className="pulse-chat-row ai">
                                        <div className="pulse-chat-bubble pulse-chat-typing">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                );
                            }

                            if (message.kind === 'rewrite') {
                                return (
                                    <div key={message.id} className="pulse-chat-meta pulse-chat-rewrite">
                                        <span>🔍 Interpreted as: {message.text}</span>
                                    </div>
                                );
                            }

                            if (message.kind === 'data') {
                                return (
                                    <div key={message.id} className="pulse-chat-row ai">
                                        <div className="pulse-chat-bubble pulse-chat-data">
                                            <div className="pulse-bubble-head">
                                                <span className="pulse-bubble-kicker">Data Cards</span>
                                                <button
                                                    type="button"
                                                    className="pulse-bubble-copy"
                                                    onClick={() => handleCopy(message.id, message.sql ?? '')}
                                                >
                                                    {copiedMessageId === message.id ? 'Copied' : 'Copy SQL'}
                                                </button>
                                            </div>
                                            <div className="pulse-chat-card-grid">
                                                {message.cards.map((card) => (
                                                    <article key={card.id} className="pulse-data-card">
                                                        <strong>{card.title}</strong>
                                                        <div className="pulse-data-card-fields">
                                                            {card.fields.map((field) => (
                                                                <div key={field.key} className="pulse-data-field">
                                                                    <span>{field.label}</span>
                                                                    <strong>{field.value}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                            <details className="pulse-source-details">
                                                <summary>View Source Query</summary>
                                                <code>{message.sql}</code>
                                            </details>
                                        </div>
                                    </div>
                                );
                            }

                            const isUser = message.role === 'user';
                            const bubbleClass = [
                                'pulse-chat-bubble',
                                isUser ? 'pulse-chat-user' : 'pulse-chat-ai',
                                message.kind === 'insight' ? 'pulse-chat-insight' : '',
                                message.kind === 'error' ? 'pulse-chat-error' : ''
                            ].join(' ').trim();

                            return (
                                <div key={message.id} className={`pulse-chat-row ${isUser ? 'user' : 'ai'}`}>
                                    <div className={bubbleClass}>
                                        {!isUser && message.title && (
                                            <span className="pulse-bubble-kicker">{message.title}</span>
                                        )}
                                        <p>{message.text}</p>
                                        {!isUser && message.actions && (
                                            <div className="pulse-bubble-actions">
                                                <button
                                                    type="button"
                                                    className="pulse-bubble-copy"
                                                    onClick={() => handleCopy(message.id, message.text)}
                                                >
                                                    {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pulse-bubble-copy"
                                                    onClick={() => setInput(`Explain more about: ${lastQuery || message.text}`)}
                                                >
                                                    Explain More
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pulse-bubble-copy"
                                                    onClick={() => void handlePrompt(lastQuery)}
                                                    disabled={!lastQuery || loading || cooldown}
                                                >
                                                    Regenerate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="pulse-chat-compose">
                        <div className="pulse-chat-chip-label">Follow-up</div>
                        <div className="pulse-chat-chip-row pulse-inline-suggestions">
                            {inlineSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className="pulse-chat-chip"
                                    onClick={() => setInput(suggestion)}
                                    disabled={loading || cooldown}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>

                        <div className="pulse-assistant-input-row pulse-chat-input-row">
                            <span className="pulse-assistant-prompt">{'>'}</span>
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder="Ask me anything about matches, players, transfers, or stadiums..."
                                className="pulse-assistant-input"
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void handlePrompt(input);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="pulse-assistant-send"
                                onClick={() => void handlePrompt(input)}
                                disabled={loading || cooldown}
                            >
                                {loading ? 'Thinking' : cooldown ? 'Cooldown' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button type="button" className="pulse-assistant-toggle" onClick={() => setIsOpen((current) => !current)}>
                <PulseAiMark size="lg" glow animated />
            </button>
        </div>
    );
};

export default PulseAssistant;
