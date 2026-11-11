import React, { useState } from 'react';
import { FilmEmulationProfile } from '../color-science/types.ts';
import { X, Sparkles, Send, Terminal, Copy, Check, BookOpen } from 'lucide-react';
import { safeFetchJson } from '../utils/safeApi.ts';

interface ScientistConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: FilmEmulationProfile;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUERIES = [
  'How do I calculate trilinear interpolation for a 33x33x33 .cube LUT in Python with NumPy?',
  'Derive the exact mathematical formulas for Cineon Log encoding and decoding.',
  'How do I implement an anti-halation shader in GLSL without performance drop on mobile?',
  'Explain the color science difference between Kodak Portra 400 and Fuji Superia 400 dye couplers.',
  'Provide a Metal compute kernel for fast 3D texture LUT sampling on iOS.',
];

export const ScientistConsultationModal: React.FC<ScientistConsultationModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Greetings. I am your Senior Color Scientist and Film Emulation Specialist.

I can assist you with:
1. **Mathematical derivations**: Sensitometric H&D curves, Cineon Log, ACEScc, and transfer functions.
2. **Production code**: Vectorized Python (OpenCV/Pillow), OpenGL/WebGL (GLSL ES 3.0), Apple Metal (MSL), and Apple CoreImage (CIFilter).
3. **Lookup Tables**: .cube 3D LUT generation and HaldCLUT matrices.
4. **Spectral Emulation**: Dye coupler cross-talk, highlight shoulder compression, and physical halation.

Ask any color science question or select a technical query below.`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await safeFetchJson<{ response: string }>('/api/consult-scientist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          activeParameters: {
            stockName: activeProfile.name,
            sensitometry: activeProfile.sensitometry,
            colorMatrix: activeProfile.colorMatrix,
            colorGrading: activeProfile.colorGrading,
            opticalArtifacts: activeProfile.opticalArtifacts,
            targetSpace: activeProfile.targetColorSpace,
          },
        }),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Error**: ${err.message || 'Could not communicate with the Color Science engine.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Color Scientist & Shader Terminal
              </h2>
              <p className="text-xs text-slate-400">
                Direct consultation for Python, GLSL, Metal, and sensitometric mathematical proofs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggested Queries Pill Strip */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto shrink-0 text-xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-400" />
            Inquiries:
          </span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 whitespace-nowrap transition-colors shrink-0"
            >
              {q.slice(0, 42)}...
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-3xl rounded-xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 text-slate-100 border border-amber-500/30 font-medium'
                    : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-800/60 font-mono text-[10px] text-slate-400">
                  <span>{msg.role === 'user' ? 'YOU (ENGINEER)' : 'COLOR SCIENTIST'}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="whitespace-pre-wrap select-text font-sans">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono">
              <Terminal className="w-4 h-4 animate-pulse" />
              <span>Color Scientist is deriving transformations & code...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about color science, LUT math, GLSL, Metal, or OpenCV Python code..."
              className="flex-1 px-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Specialist</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
