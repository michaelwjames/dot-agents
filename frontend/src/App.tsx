import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Mic, LogOut } from 'lucide-react';

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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');

        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/transcribe', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          handleSendMessage(response.data.text);
        } catch (error) {
          console.error('Transcription failed', error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Media devices access denied', error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
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
        <button onClick={handleLogout} aria-label="Logout"><LogOut size={20} /></button>
      </header>

      <div className="messages-list">
        {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
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
          <button
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            <Mic size={24} color={isRecording ? 'red' : 'currentColor'} />
          </button>
          <button className="send-btn" onClick={() => handleSendMessage()}>
            <Send size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
