import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Mic, LogOut, Menu, X, Copy, Check } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  name?: string;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'listening' | 'sending'>('idle');
  const transcriptionStatusRef = useRef(transcriptionStatus);
  useEffect(() => {
    transcriptionStatusRef.current = transcriptionStatus;
  }, [transcriptionStatus]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const sessionId = 'web-boss-session';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchHistory(token);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isConsoleOpen) {
      fetchLogs();
    }
  }, [isConsoleOpen]);

  useEffect(() => {
    if (isConsoleOpen) {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const copyLogsToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const fetchHistory = async (token: string) => {
    try {
      const response = await axios.get(`/api/history/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch history', error);
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', { password });
      localStorage.setItem('token', response.data.accessToken);
      setIsAuthenticated(true);
      fetchHistory(response.data.accessToken);
    } catch (error) {
      alert('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setMessages([]);
  };

  const handleSendMessage = async (text?: string) => {
    const content = text || inputText;
    if (!content.trim()) return;

    if (!text) setInputText('');

    // Optimistic UI update
    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/message',
        { sessionId, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { intermediateMessages, ...lastMessage } = response.data;

      if (intermediateMessages && intermediateMessages.length > 0) {
        setMessages(prev => [
          ...prev,
          ...intermediateMessages.map((text: string) => ({ role: 'assistant' as const, content: text })),
          lastMessage
        ]);
      } else {
        setMessages(prev => [...prev, lastMessage]);
      }
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (transcriptionStatusRef.current === 'idle') return; // Cancelled

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');

        abortControllerRef.current = new AbortController();
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/transcribe', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            signal: abortControllerRef.current.signal
          });

          const text = response.data.text;
          setInputText(prev => (prev.trim() ? prev + ' ' + text : text));
          setTranscriptionStatus('idle');
        } catch (error: any) {
          if (axios.isCancel(error)) {
            console.log('Transcription cancelled');
          } else {
            console.error('Transcription failed', error);
            setTranscriptionStatus('idle');
          }
        }
      };

      mediaRecorder.start();
      setTranscriptionStatus('listening');
    } catch (error) {
      console.error('Media devices access denied', error);
      setTranscriptionStatus('idle');
    }
  };

  const stopRecording = () => {
    setTranscriptionStatus('sending');
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
  };

  const cancelTranscription = () => {
    if (transcriptionStatus === 'listening') {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    }
    if (transcriptionStatus === 'sending') {
      abortControllerRef.current?.abort();
    }
    setTranscriptionStatus('idle');
    setShowCancelled(true);
    setTimeout(() => setShowCancelled(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <img src="/icon-192.svg" alt="Boss Agent" width="80" height="80" />
          <h1>Boss Agent</h1>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Boss Agent</h1>
        <button className="menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
          <Menu size={24} />
        </button>
      </header>

      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setIsConsoleOpen(true); setIsMenuOpen(false); }}>
              Console
            </button>
            <button onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}

      {isConsoleOpen && (
        <div className="console-modal-overlay" onClick={() => setIsConsoleOpen(false)}>
          <div className="console-modal" onClick={e => e.stopPropagation()}>
            <div className="console-header">
              <h2>Console</h2>
              <div className="console-actions">
                <button onClick={copyLogsToClipboard} aria-label="Copy logs">
                  {hasCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
                <button onClick={() => setIsConsoleOpen(false)} aria-label="Close">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="console-content">
              {isLoadingLogs ? (
                <div className="console-loading">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="console-empty">No logs found.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="log-line">{log}</div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      )}

      <div className="messages-list">
        {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
        {showCancelled && (
          <div className="toast-notification">
            Transcription cancelled
          </div>
        )}
      </div>

      <footer className="chat-footer">
        <div className="input-row">
          <input
            type="text"
            placeholder="Speak your mind, Boss..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <div className={`voice-container ${transcriptionStatus}`}>
            {transcriptionStatus === 'listening' && (
              <div className="status-label">
                <div className="pulse-dot"></div>
                <span>Listening</span>
              </div>
            )}
            {transcriptionStatus === 'sending' && (
              <div className="status-label">
                <span>Sending...</span>
              </div>
            )}
            <button
              className={`voice-btn`}
              onClick={() => {
                if (transcriptionStatus === 'idle') startRecording();
                else if (transcriptionStatus === 'listening') stopRecording();
                else cancelTranscription();
              }}
            >
              <Mic size={24} color={transcriptionStatus === 'listening' ? 'red' : 'currentColor'} />
            </button>
          </div>
          <button className="send-btn" onClick={() => handleSendMessage()}>
            <Send size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
