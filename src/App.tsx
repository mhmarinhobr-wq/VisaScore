/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  FileText, 
  GraduationCap, 
  HelpCircle, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
  Menu,
  X,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  Mail,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { QUESTIONS } from './data/questions';
import { CHECKLIST_DATA } from './data/checklist';
import { calculateResult } from './lib/scoring';
import { SimulationResult, UserProfile, AppContent, View } from './types';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appContent, setAppContent] = useState<AppContent>({
    ds160_1: '',
    ds160_2: '',
    ds160_3: '',
    ds160_4: '',
    checklist: '',
    preparation: ''
  });
  const [readerContent, setReaderContent] = useState<{ title: string, url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Load checklist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('checklist_progress');
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to load checklist", e);
      }
    }
  }, []);

  // Save checklist to localStorage
  useEffect(() => {
    localStorage.setItem('checklist_progress', JSON.stringify(Array.from(checkedItems)));
  }, [checkedItems]);

  useEffect(() => {
    // Magic Link logic removed as per user request for simplification
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Recover email
          let email = user.email ? user.email.toLowerCase() : '';
          if (!email && user.uid.startsWith('email_')) {
             const hexEmail = user.uid.replace('email_', '');
             try {
                email = hexEmail.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('').toLowerCase() || '';
             } catch (e) { 
                console.error("Failed to recover email from UID", e); 
             }
          }

          if (!email) {
            console.error("User logged in but no email found. Identity unification requires email.");
            setLoading(false);
            return;
          }

          const userPath = `users/${email}`;
          const userDoc = await getDoc(doc(db, 'users', email));
          
          let userStatus: 'active' | 'pending' | 'blocked' = 'pending';
          
          // Check whitelist
          const whitelistDoc = await getDoc(doc(db, 'whitelists', email));
          if (whitelistDoc.exists()) {
            userStatus = 'active';
          }

          // Special case for creator
          if (email === 'mhmarinhobr@gmail.com') {
            userStatus = 'active';
          }

          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Usuário',
              email: email,
              status: userStatus,
              createdAt: new Date().toISOString(),
              lastAccess: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'users', email), newProfile);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, userPath);
            }
            setProfile(newProfile);
          } else {
            const data = userDoc.data() as UserProfile;
            
            // Sync current UID if it changed (unification)
            if (data.uid !== user.uid) {
              await updateDoc(doc(db, 'users', email), { uid: user.uid });
              data.uid = user.uid;
            }

            // Sync email if missing
            if (!data.email) {
              await updateDoc(doc(db, 'users', email), { email: email });
              data.email = email;
            }

            // If whitelisted now, upgrade status
            if (data.status === 'pending' && userStatus === 'active') {
              try {
                await updateDoc(doc(db, 'users', email), { status: 'active' });
                data.status = 'active';
              } catch (e) {
                console.warn("Failed to upgrade status automatically.");
              }
            }

            try {
              await updateDoc(doc(db, 'users', email), { lastAccess: new Date().toISOString() });
            } catch (e) {
              console.warn("Failed to update lastAccess.");
            }
            
            // Check admin status
            let isAdminUser = false;
            try {
              const adminDoc = await getDoc(doc(db, 'admins', email));
              isAdminUser = adminDoc.exists();
            } catch (e) {
              console.warn("User is not an admin.");
            }

            // Bootstrap admin
            if (!isAdminUser && email === 'mhmarinhobr@gmail.com') {
              try {
                await setDoc(doc(db, 'admins', email), { email: email });
                isAdminUser = true;
                if (data.status !== 'active') {
                   await updateDoc(doc(db, 'users', email), { status: 'active' });
                   data.status = 'active';
                }
              } catch (e) {
                console.error("Failed to bootstrap admin:", e);
              }
            }

            setProfile({ ...data, isAdmin: isAdminUser });
          }
        } catch (error) {
          // Find email for error reporting if possible
          const email = user.email?.toLowerCase() || 'unknown';
          handleFirestoreError(error, OperationType.GET, `users/${email}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Content Listener
  useEffect(() => {
    if (!user) return;
    
    const path = 'settings/content';
    const unsubscribe = onSnapshot(doc(db, 'settings', 'content'), (snapshot) => {
      if (snapshot.exists()) {
        setAppContent(snapshot.data() as AppContent);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user]);

  const result = useMemo(() => {
    if (Object.keys(responses).length < QUESTIONS.length) return null;
    return calculateResult(responses);
  }, [responses]);

  const handleAnswer = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCurrentView('result');
    }
  };

  const resetSimulator = () => {
    setResponses({});
    setCurrentQuestionIndex(0);
    setCurrentView('simulator');
  };

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray-light">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return <LoginView onLogin={handleLogin} />;
  
  if (profile && profile.status === 'pending' && !profile.isAdmin) {
    return <AccessDeniedView email={profile.email} onLogout={handleLogout} />;
  }

  if (profile?.status === 'blocked') return <BlockedView onLogout={handleLogout} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onStart={resetSimulator} onView={setCurrentView} onViewReader={setReaderContent} hasResult={!!result} appContent={appContent} />;
      case 'simulator': return <Simulator currentIdx={currentQuestionIndex} responses={responses} onAnswer={handleAnswer} onPrev={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))} />;
      case 'result': return <ResultView result={result} onReset={resetSimulator} />;
      case 'checklist': return (
        <InteractiveChecklist 
          checkedItems={checkedItems} 
          onToggle={(id) => {
            const next = new Set(checkedItems);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setCheckedItems(next);
          }}
          onBack={() => setCurrentView('dashboard')}
        />
      );
      case 'admin_users': return profile?.isAdmin ? <AdminUsers /> : <Dashboard onStart={resetSimulator} onView={setCurrentView} onViewReader={setReaderContent} hasResult={!!result} appContent={appContent} />;
      case 'admin_content': return profile?.isAdmin ? <AdminContent content={appContent} /> : <Dashboard onStart={resetSimulator} onView={setCurrentView} onViewReader={setReaderContent} hasResult={!!result} appContent={appContent} />;
      default: return <Dashboard onStart={resetSimulator} onView={setCurrentView} onViewReader={setReaderContent} hasResult={!!result} appContent={appContent} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden text-slate-900">
      {/* Reader Overlay */}
      {readerContent && (
        <Reader 
          title={readerContent.title} 
          url={readerContent.url} 
          onClose={() => setReaderContent(null)} 
        />
      )}
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">VS</span>
          </div>
          <span className="font-display font-bold text-lg text-brand-blue">VisaScore</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed md:relative inset-0 z-50 md:z-auto transition-transform duration-300 md:translate-x-0
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        w-full md:w-72 bg-brand-blue text-white p-6 flex flex-col gap-8 shadow-2xl md:shadow-none
      `}>
        <div className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-brand-blue font-bold text-lg">VS</span>
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">VisaScore</span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <NavItem active={currentView === 'dashboard' && !readerContent} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => { setCurrentView('dashboard'); setReaderContent(null); setIsMenuOpen(false); }} />
          <NavItem active={currentView === 'simulator'} icon={<Play size={20} />} label="Simulador" onClick={() => { setCurrentView('simulator'); setReaderContent(null); setIsMenuOpen(false); }} />
          <NavItem active={currentView === 'result'} icon={<CheckCircle2 size={20} />} label="Resultado" onClick={() => { setCurrentView('result'); setReaderContent(null); setIsMenuOpen(false); }} />
          <NavItem active={false} icon={<FileText size={20} />} label="Guia DS-160" onClick={() => { window.open(appContent.ds160_1, '_blank'); setIsMenuOpen(false); }} />
          <NavItem active={currentView === 'checklist'} icon={<ClipboardCheck size={20} />} label="Checklist Final" onClick={() => { setCurrentView('checklist'); setIsMenuOpen(false); }} />
          <NavItem active={false} icon={<GraduationCap size={20} />} label="Preparação" onClick={() => { window.open(appContent.preparation, '_blank'); setIsMenuOpen(false); }} />
          
          {profile?.isAdmin && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-1">
              <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Painel Admin</p>
              <NavItem active={currentView === 'admin_users'} icon={<Users size={20} />} label="Usuários" onClick={() => { setCurrentView('admin_users'); setIsMenuOpen(false); }} />
              <NavItem active={currentView === 'admin_content'} icon={<Settings size={20} />} label="Conteúdos" onClick={() => { setCurrentView('admin_content'); setIsMenuOpen(false); }} />
            </div>
          )}
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-white/60">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt={profile?.displayName} className="w-full h-full object-cover" /> : profile?.displayName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium truncate text-white">{profile?.displayName}</p>
              <p className="text-[10px] truncate">{profile?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
          <div className="p-4 bg-white/10 rounded-xl border border-white/10">
            <p className="text-xs text-white/60 mb-1">Dúvidas?</p>
            <a 
              href="https://wa.me/5543996285608" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:text-white/80 transition-colors"
            >
              <MessageCircle size={16} /> Suporte via WhatsApp
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 lg:p-16 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
        ${active ? 'bg-white text-brand-blue shadow-lg' : 'hover:bg-white/10 text-white/70'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function Dashboard({ onStart, onView, onViewReader, hasResult, appContent }: { 
  onStart: () => void, 
  onView: (v: View) => void, 
  onViewReader: (content: { title: string, url: string }) => void,
  hasResult: boolean, 
  appContent: AppContent 
}) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <span className="text-brand-red font-bold tracking-widest uppercase text-sm">Aprove seu visto</span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-brand-blue max-w-2xl leading-none">
          Bem-vindo ao seu VisaScore
        </h1>
        <p className="text-xl text-slate-500 max-w-xl">
          Descubra seu nível de aprovação e evite erros comuns no processo do visto americano com nossa inteligência de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simulador Card */}
        <button className="glass-card p-8 flex flex-col items-start gap-6 hover:border-brand-blue/30 hover:bg-slate-50 transition-all cursor-pointer group text-left w-full" onClick={onStart}>
          <div className="w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-blue/20">
            <Play size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Iniciar Simulador</h3>
            <p className="text-slate-500">Responda as perguntas e tenha seu diagnóstico personalizado.</p>
          </div>
          <div className="flex items-center gap-2 text-brand-blue font-bold group-hover:translate-x-2 transition-transform">
            Começar agora <ChevronRight size={18} />
          </div>
        </button>

        {/* DS-160 Card */}
        <div className="glass-card p-8 flex flex-col items-start gap-6 border-brand-red/10 bg-brand-red/[0.02]">
          <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-red/20">
            <FileText size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Guia DS-160</h3>
            <p className="text-slate-500 text-sm">O mapa completo dividido em 4 etapas essenciais.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            <button onClick={() => window.open(appContent.ds160_1, '_blank')} className="text-[10px] font-bold py-2 bg-white border border-brand-red/20 text-brand-red rounded-lg hover:bg-brand-red hover:text-white transition-all uppercase tracking-widest text-center">Parte 1</button>
            <button onClick={() => window.open(appContent.ds160_2, '_blank')} className="text-[10px] font-bold py-2 bg-white border border-brand-red/20 text-brand-red rounded-lg hover:bg-brand-red hover:text-white transition-all uppercase tracking-widest text-center">Parte 2</button>
            <button onClick={() => window.open(appContent.ds160_3, '_blank')} className="text-[10px] font-bold py-2 bg-white border border-brand-red/20 text-brand-red rounded-lg hover:bg-brand-red hover:text-white transition-all uppercase tracking-widest text-center">Parte 3</button>
            <button onClick={() => window.open(appContent.ds160_4, '_blank')} className="text-[10px] font-bold py-2 bg-white border border-brand-red/20 text-brand-red rounded-lg hover:bg-brand-red hover:text-white transition-all uppercase tracking-widest text-center">Parte 4</button>
          </div>
        </div>

        {/* Checklist Card */}
        <button className="glass-card p-8 flex flex-col items-start gap-6 hover:border-brand-blue/30 hover:bg-slate-50 transition-all cursor-pointer group text-left w-full" onClick={() => onView('checklist')}>
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-800/20">
            <ClipboardCheck size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Checklist Final</h3>
            <p className="text-slate-500">Confira se você tem tudo o que é necessário para o dia D.</p>
          </div>
          <div className="flex items-center gap-2 text-slate-800 font-bold group-hover:translate-x-2 transition-transform">
            Abrir Checklist <ChevronRight size={18} />
          </div>
        </button>

        {/* Preparação Card */}
        <button className="glass-card p-8 flex flex-col items-start gap-6 hover:border-brand-blue/30 hover:bg-slate-50 transition-all cursor-pointer group text-left w-full" onClick={() => window.open(appContent.preparation, '_blank')}>
          <div className="w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-blue/20">
            <GraduationCap size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Preparação Entrevista</h3>
            <p className="text-slate-500">O que falar no dia D e como se portar perante o Cônsul.</p>
          </div>
          <div className="flex items-center gap-2 text-brand-blue font-bold group-hover:translate-x-2 transition-transform">
            Ler Ebook <ChevronRight size={18} />
          </div>
        </button>

        <div className="glass-card p-8 flex flex-col items-start gap-6 hover:border-brand-blue/30 transition-colors cursor-pointer group col-span-1 md:col-span-2" onClick={() => onView('result')}>
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <CheckCircle2 size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Meu Resultado</h3>
            <p className="text-slate-500">{hasResult ? 'Seu último diagnóstico está disponível aqui.' : 'Faça a simulação primeiro para ver seu score.'}</p>
          </div>
          <button className="flex items-center gap-2 text-emerald-600 font-bold group-hover:translate-x-2 transition-transform" disabled={!hasResult}>
            {hasResult ? 'Ver resultado' : 'Bloqueado'} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Simulator({ currentIdx, responses, onAnswer, onPrev }: { 
  currentIdx: number, 
  responses: Record<string, string>, 
  onAnswer: (id: string, val: string) => void,
  onPrev: () => void 
}) {
  const q = QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / QUESTIONS.length) * 100;

  return (
    <div className="space-y-8 py-10">
      <div className="space-y-4">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-brand-blue uppercase tracking-widest">{q.section.replace('_', ' ')}</span>
          <span className="text-sm font-medium text-slate-400">Pergunta {currentIdx + 1} de {QUESTIONS.length}</span>
        </div>
        <div className="w-full h-3 bg-brand-gray rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-brand-blue rounded-full"
          />
        </div>
      </div>

      <div className="space-y-10">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
          {q.text}
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {q.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => onAnswer(q.id, opt.value)}
              className={`
                group glass-card p-6 text-left transition-all flex items-center justify-between
                ${responses[q.id] === opt.value ? 'border-brand-blue bg-blue-50 ring-2 ring-brand-blue/10' : 'hover:border-slate-300 hover:shadow-md'}
              `}
            >
              <span className="text-xl font-medium text-slate-700">{opt.label}</span>
              <div className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                ${responses[q.id] === opt.value ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-200 text-transparent group-hover:border-slate-300'}
              `}>
                <CheckCircle2 size={16} />
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between pt-6 border-t border-slate-100">
          <button 
            onClick={onPrev}
            disabled={currentIdx === 0}
            className="btn-outline"
          >
            <ChevronLeft size={20} /> Anterior
          </button>
          <p className="text-slate-400 text-sm flex items-center gap-2 italic">
            <AlertCircle size={14} /> Suas respostas são anônimas e seguras
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, onReset }: { result: SimulationResult | null, onReset: () => void }) {
  if (!result) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-6">
      <HelpCircle size={64} className="text-slate-300" />
      <h2 className="text-3xl font-bold text-slate-800">Nenhum resultado ainda</h2>
      <p className="text-slate-500 max-w-sm">Você precisa completar o simulador para que possamos analisar suas chances de aprovação.</p>
      <button onClick={onReset} className="btn-primary">Iniciar Agora</button>
    </div>
  );

  const getClassificationStyles = () => {
    switch (result.classification) {
      case 'Forte': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 className="text-emerald-500" size={32} /> };
      case 'Médio': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertCircle className="text-amber-500" size={32} /> };
      case 'Arriscado': return { color: 'text-brand-red', bg: 'bg-red-50', border: 'border-brand-red/20', icon: <XCircle className="text-brand-red" size={32} /> };
    }
  };

  const styles = getClassificationStyles();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row gap-8 items-stretch">
        <div className="flex-1 glass-card p-10 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
          <div className={`absolute top-0 right-0 p-4 font-bold text-xs uppercase tracking-widest ${styles.color}`}>
            Score Analítico
          </div>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="96" cy="96" r="88" className="fill-transparent stroke-slate-100 stroke-[12]" />
              <motion.circle 
                cx="96" cy="96" r="88" 
                className={`fill-transparent stroke-[12] ${styles.color} stroke-current`}
                strokeDasharray="553"
                initial={{ strokeDashoffset: 553 }}
                animate={{ strokeDashoffset: 553 - (553 * result.score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-slate-800">{result.score}</span>
              <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">Pontos</span>
            </div>
          </div>
          <div className={`mt-4 px-6 py-2 rounded-full font-bold text-lg uppercase tracking-wider ${styles.bg} ${styles.color} border ${styles.border}`}>
            Perfil {result.classification}
          </div>
        </div>

        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="glass-card p-6 flex-1 flex flex-col justify-center gap-2">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Resumo</h4>
            <p className="text-slate-700 leading-relaxed italic">
              "Baseado em seu histórico profissional, vínculos no Brasil e planos de viagem, seu perfil apresenta um risco {result.classification.toLowerCase()}."
            </p>
          </div>
          <button onClick={onReset} className="btn-secondary w-full py-4 text-lg">
            <RotateCcw size={20} /> Refazer Simulação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SectionList title="Pontos Fortes" items={result.positives} icon={<CheckCircle2 className="text-emerald-500" size={20} />} />
        <SectionList title="Pontos de Atenção" items={result.negatives} icon={<AlertCircle className="text-amber-500" size={20} />} />
        {result.risks.length > 0 && <SectionList title="Riscos Detectados" items={result.risks} icon={<XCircle className="text-brand-red" size={20} />} />}
        <SectionList title="Recomendações" items={result.recommendations} icon={<FileText className="text-brand-blue" size={20} />} />
      </div>
    </div>
  );
}

function Reader({ title, url, onClose }: { title: string, url: string, onClose: () => void }) {
  // Lógica de conversão de link para Embed do Gamma ultra-resiliente
  let secureUrl = url;
  if (url && url.includes('gamma.app')) {
    const match = url.match(/\/(public|docs|view|embed)\/([^/?#]+)/);
    if (match && match[2]) {
      const lastPart = match[2];
      const id = lastPart.includes('-') ? lastPart.split('-').pop() : lastPart;
      // tr=true ajuda na transição mobile do Gamma
      if (id) secureUrl = `https://gamma.app/embed/${id}?tr=true`;
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-200">
      {/* Header Mobile Otimizado */}
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-4 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <button 
          onClick={onClose} 
          className="flex items-center gap-1.5 text-brand-blue font-bold px-2 py-1.5 hover:bg-slate-50 active:scale-95 rounded-lg transition-all text-sm"
        >
          <ChevronLeft size={20} /> <span className="hidden xs:inline">Voltar</span>
        </button>
        
        <h2 className="flex-1 text-center font-bold text-slate-800 truncate px-2 text-[10px] md:text-sm uppercase tracking-wider">{title}</h2>
        
        <button 
          onClick={() => window.open(url, '_blank')}
          className="flex items-center gap-1.5 text-slate-600 font-medium px-2 py-1.5 hover:bg-slate-50 active:scale-95 rounded-lg transition-all border border-slate-200 text-xs shadow-sm bg-white"
        >
          <span className="hidden sm:inline">Ver no Site</span> 
          <ExternalLink size={16} />
        </button>
      </div>
      
      {/* Área de Conteúdo Force Fill */}
      <div className="flex-1 bg-slate-50 relative overflow-hidden">
        {!url ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 font-sans p-6 text-center">
            <FileText size={48} />
            <p className="font-medium text-lg">Conteúdo não disponível.</p>
            <p className="text-sm">Link não configurado corretamente.</p>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full">
            <iframe 
              src={secureUrl} 
              className="w-full h-full border-none m-0 p-0 block bg-white"
              style={{ width: '100%', height: '100%', minHeight: '100%' }}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              loading="eager"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'CHECKING_WHITELIST' | 'ENTER_PASSWORD' | 'CREATE_PASSWORD'>('IDLE');
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetFlow = () => {
    setStatus('IDLE');
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch('/api/verify-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      if (!response.ok) {
        let errorMsg = `Erro ao verificar acesso (Status: ${response.status}). Tente novamente.`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response as JSON:", e);
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.whitelisted) {
        throw new Error(data.error || 'Nenhuma compra encontrada para este e-mail.');
      }

      setEmail(data.email);
      if (data.existsInAuth) {
        setStatus('ENTER_PASSWORD');
      } else {
        setStatus('CREATE_PASSWORD');
        setSuccessMsg('Compra identificada! Crie sua senha de acesso abaixo.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else if (err.code === 'auth/user-disabled') setError('Esta conta foi desativada.');
      else if (err.code === 'auth/too-many-requests') setError('Muitas tentativas. Tente mais tarde.');
      else setError('Erro ao entrar. Verifique sua senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Profile will be created by onAuthStateChanged listener
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setStatus('ENTER_PASSWORD');
        setError('E-mail já possui senha cadastrada. Faça login.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLogin();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-blue flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 md:p-10 space-y-8 text-center border-t-8 border-brand-red flex flex-col relative overflow-hidden"
      >
        <div className="w-16 h-16 bg-brand-blue rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shrink-0">
          <span className="text-3xl font-bold">VS</span>
        </div>
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-blue tracking-tight">
            {status === 'CREATE_PASSWORD' ? 'Primeiro Acesso — Criar Senha' : 'O sonho americano começa aqui.'}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed px-4 text-center">
            {status === 'IDLE' && 'Digite o seu e-mail de compra na WIAPY para liberar seu acesso exclusivo.'}
            {status === 'ENTER_PASSWORD' && 'E-mail verificado com sucesso! Digite sua senha pessoal para entrar.'}
            {status === 'CREATE_PASSWORD' && 'Use o mesmo e-mail utilizado na compra. Crie uma senha pessoal para acessar sua conta sempre que entrar no app.'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-brand-red text-xs text-left">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-xs text-left">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="relative">
          <AnimatePresence mode="wait">
            {status === 'IDLE' ? (
              <motion.form 
                key="step-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyEmail} 
                className="space-y-4"
              >
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">E-mail Cadastrado na Compra</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                    {loading ? <LoadingSpinner /> : 'Verificar Acesso'}
                  </button>

                  <div className="flex flex-col gap-3 items-center justify-center">
                    <button 
                      type="button" 
                      onClick={() => {
                        setError(null);
                        setSuccessMsg('Para criar sua conta, insira o seu e-mail de compra acima e clique em "Verificar Acesso".');
                      }}
                      className="text-xs text-slate-400 hover:text-brand-blue transition-colors font-medium"
                    >
                      Ainda não tem conta? <span className="text-brand-blue font-bold">Criar conta</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowResetModal(true)}
                      className="text-xs text-slate-400 hover:text-brand-blue transition-colors font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou continue com</span>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Entrar com Google
                  </button>
                </div>
              </motion.form>
            ) : status === 'ENTER_PASSWORD' ? (
              <motion.form 
                key="step-login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignIn} 
                className="space-y-4"
              >
                <div className="space-y-4 text-left">
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 truncate">{email}</span>
                    <button type="button" onClick={resetFlow} className="text-[10px] font-bold text-brand-blue uppercase hover:underline">Alterar</button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Sua Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required 
                        autoFocus
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                    {loading ? <LoadingSpinner /> : 'Entrar'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowResetModal(true)}
                    className="text-xs text-slate-400 hover:text-brand-blue transition-colors font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </motion.form>
            ) : status === 'CREATE_PASSWORD' ? (
              <motion.form 
                key="step-create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignUp}
                className="space-y-4"
              >
                <div className="space-y-4 text-left">
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 truncate">{email}</span>
                    <button type="button" onClick={resetFlow} className="text-[10px] font-bold text-brand-blue uppercase hover:underline">Alterar</button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Criar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required 
                        autoFocus
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                  {loading ? <LoadingSpinner /> : 'Criar acesso'}
                </button>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t border-slate-50 space-y-4">
          <p className="text-[10px] text-slate-400 leading-relaxed italic px-4">
            Acesso exclusivo para compradores WIAPY. Use o e-mail cadastrado na hora da compra. Crie sua senha em seu primeiro acesso.
          </p>
          
          <a 
            href="https://wa.me/5543996285608" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 py-3 rounded-2xl border border-emerald-100 shadow-sm mx-2"
          >
            <MessageCircle size={18} />
            Problemas no acesso? Suporte via WhatsApp
          </a>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal 
          isOpen={showResetModal} 
          onClose={() => setShowResetModal(false)} 
          initialEmail={email}
        />
      </motion.div>
    </div>
  );
}

function ForgotPasswordModal({ isOpen, onClose, initialEmail }: { isOpen: boolean, onClose: () => void, initialEmail: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setSent(false);
      setError(null);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço digitado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-brand-blue">Recuperar Senha</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed">
              {sent ? 'Estamos quase lá!' : 'Informe seu e-mail para receber um link de redefinição de senha.'}
            </p>

            {sent ? (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 text-xs text-left animate-in fade-in">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Enviamos um link para redefinir sua senha.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">E-mail de Cadastro</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-slate-700"
                    />
                  </div>
                </div>
                {error && <p className="text-[10px] text-brand-red font-bold text-center">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                  {loading ? <LoadingSpinner /> : 'Redefinir Senha'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LoadingSpinner() {
  return (
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} 
      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" 
    />
  );
}

function BlockedView({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8 text-center">
        <div className="w-20 h-20 bg-brand-red/10 rounded-full mx-auto flex items-center justify-center text-brand-red">
          <Lock size={40} />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Acesso Desativado</h1>
          <p className="text-slate-600">Seu acesso foi desativado por um administrador. Por favor, entre em contato com o suporte para mais informações.</p>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-sm font-medium text-brand-red italic">"Seu acesso foi desativado. Entre em contato com o suporte."</p>
        </div>
        <button 
          onClick={onLogout}
          className="w-full py-4 px-6 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}

function AccessDeniedView({ email, onLogout }: { email: string, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8 text-center border border-slate-100">
        <div className="w-20 h-20 bg-brand-blue/10 rounded-full mx-auto flex items-center justify-center text-brand-blue">
          <ShieldAlert size={40} />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Acesso Pendente</h1>
          <p className="text-slate-600">O e-mail <strong>{email}</strong> ainda não está autorizado a acessar o sistema.</p>
        </div>
        
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
          <p className="text-sm text-slate-500 font-medium">Como liberar seu acesso?</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full mt-1.5 shrink-0" />
              <span>Certifique-se de que este é o e-mail que você usou na WIAPY.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full mt-1.5 shrink-0" />
              <span>O sistema libera acesso automaticamente após a aprovação do pagamento.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full mt-1.5 shrink-0" />
              <span>Se você acabou de comprar, aguarde 5 minutos e tente novamente.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 px-6 bg-brand-blue text-white rounded-2xl font-bold hover:bg-brand-blue-dark transition-all shadow-lg"
          >
            Tentar Novamente
          </button>
          <button 
            onClick={onLogout}
            className="text-sm text-slate-400 font-bold hover:text-slate-600 p-2"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [whitelists, setWhitelists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'whitelist'>('users');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    const unsubWhitelist = onSnapshot(collection(db, 'whitelists'), (snapshot) => {
      setWhitelists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.purchasedAt?.localeCompare(a.purchasedAt || '') || 0));
      setLoading(false);
    });
    return () => {
      unsubUsers();
      unsubWhitelist();
    };
  }, []);

  const toggleStatus = async (user: UserProfile) => {
    try {
      const newStatus = user.status === 'active' ? 'blocked' : 'active';
      await updateDoc(doc(db, 'users', user.email), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.email}`);
    }
  };

  const addToWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      const email = newEmail.toLowerCase();
      await setDoc(doc(db, 'whitelists', email), {
        email: email,
        name: newName || 'Manual',
        source: 'admin',
        purchasedAt: new Date().toISOString(),
        status: 'approved'
      });
      // Also update user if exists
      const userToUpdate = users.find(u => u.email === email);
      if (userToUpdate && userToUpdate.status === 'pending') {
        await updateDoc(doc(db, 'users', email), { status: 'active' });
      }
      setNewEmail('');
      setNewName('');
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `whitelists/${newEmail}`);
    }
  };

  const removeFromWhitelist = async (email: string) => {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    try {
      await deleteDoc(doc(db, 'whitelists', email));
      // Optionally block user
      const userToBlock = users.find(u => u.email === email);
      if (userToBlock) {
        await updateDoc(doc(db, 'users', email), { status: 'pending' });
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `whitelists/${email}`);
    }
  };

  const deleteUser = async (userEmail: string) => {
    if (confirm('Tem certeza que deseja excluir este registro de usuário?')) {
      try {
        await deleteDoc(doc(db, 'users', userEmail));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userEmail}`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-brand-blue tracking-tight">Access Control</h1>
          <p className="text-slate-500">Manage paid access and registered users.</p>
        </div>
        <button onClick={() => { setShowAddModal(true); setActiveTab('whitelist'); }} className="btn-primary">
          <Plus size={20} /> Liberar Acesso (E-mail)
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} /> Registrados ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('whitelist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'whitelist' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShieldCheck size={16} /> Whitelist ({whitelists.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u, index) => (
                  <tr key={`${u.uid || u.email}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{u.displayName}</span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                        u.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div>L: {new Date(u.lastAccess).toLocaleDateString()}</div>
                      <div>C: {new Date(u.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggleStatus(u)} title={u.status === 'active' ? 'Bloquear' : 'Ativar'} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors">
                          {u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button onClick={() => deleteUser(u.email)} title="Excluir" className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-brand-red transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">E-mail Liberado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fonte</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {whitelists.map((w, index) => (
                  <tr key={`${w.id || w.email}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{w.email}</span>
                        <span className="text-xs text-slate-400">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${w.source === 'wiapy' ? 'bg-orange-100 text-orange-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                        {w.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {w.purchasedAt ? new Date(w.purchasedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeFromWhitelist(w.email)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-brand-red transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {whitelists.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                      Nenhum e-mail na whitelist ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Liberar Novo Acesso</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={addToWhitelist} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: João Silva" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-mail de Acesso</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required 
                  placeholder="email@exemplo.com" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <button type="submit" className="btn-primary w-full py-4">Confirmar Liberação</button>
              <p className="text-[10px] text-center text-slate-400">O cliente será autorizado ao entrar com este e-mail.</p>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AdminContent({ content }: { content: AppContent }) {
  const [formData, setFormData] = useState<AppContent>({
    ds160_1: content?.ds160_1 || '',
    ds160_2: content?.ds160_2 || '',
    ds160_3: content?.ds160_3 || '',
    ds160_4: content?.ds160_4 || '',
    checklist: content?.checklist || '',
    preparation: content?.preparation || ''
  });
  const [saving, setSaving] = useState(false);

  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'content'), formData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/content');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-bold text-brand-blue tracking-tight">Gerenciar Conteúdos</h1>
        <p className="text-slate-500">Atualize os 6 links dos mini-ebooks e guias.</p>
      </div>

      <div className="glass-card p-10 max-w-2xl">
        <div className="bg-brand-blue/5 p-4 rounded-xl border border-brand-blue/10 mb-6 space-y-2">
          <p className="text-xs text-brand-blue leading-relaxed">
            <strong>Dica Pro:</strong> Você tem duas opções para cada conteúdo:
          </p>
          <ul className="text-[10px] text-brand-blue/70 space-y-1 ml-4 list-disc">
            <li><strong>Opção A (Recomendada):</strong> Cole links de imagens (PNG/JPG) separados por vírgula para criar um scroll infinito perfeito no mobile.</li>
            <li><strong>Opção B:</strong> Cole o link do Gamma para abrir como Iframe.</li>
          </ul>
        </div>

        <form onSubmit={saveContent} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4 pt-4 border-t border-slate-100 first:border-0 first:pt-0">
              <label className="text-sm font-bold text-brand-red flex items-center gap-2 uppercase tracking-widest">
                <FileText size={18} /> Guia DS-160 (4 Partes)
              </label>
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Parte {num}</span>
                  <textarea 
                    rows={2}
                    required 
                    value={(formData as any)[`ds160_${num}`]}
                    onChange={e => setFormData({ ...formData, [`ds160_${num}`]: e.target.value })}
                    placeholder="Link do Gamma ou links de imagens separados por vírgula"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-slate-600" /> Checklist Final
              </label>
              <textarea 
                rows={2}
                required 
                value={formData.checklist}
                onChange={e => setFormData({ ...formData, checklist: e.target.value })}
                placeholder="Link do Gamma ou links de imagens separados por vírgula"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-600/20 outline-none transition-all text-xs"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <GraduationCap size={18} className="text-brand-blue" /> Preparação Entrevista
              </label>
              <textarea 
                rows={2}
                required 
                value={formData.preparation}
                onChange={e => setFormData({ ...formData, preparation: e.target.value })}
                placeholder="Link do Gamma ou links de imagens separados por vírgula"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-xs"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full py-4 relative">
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4 max-w-2xl">
        <AlertCircle className="text-amber-500 shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-bold text-amber-800">Atenção Admin</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            As URLs alteradas aqui serão propagadas instantaneamente para todos os usuários através de redirecionamento automático nos cards do Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionList({ title, items, icon }: { title: string, items: string[], icon: React.ReactNode }) {
  return (
    <div className="glass-card p-8 space-y-6">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
        <span className="p-2 bg-slate-50 rounded-lg">{icon}</span>
        {title}
      </h3>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-slate-600 leading-relaxed group">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0 group-hover:bg-brand-blue transition-colors" />
            {item}
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-400 italic">Nenhum item relevante identificado.</li>}
      </ul>
    </div>
  );
}

function InteractiveChecklist({ checkedItems, onToggle, onBack }: { 
  checkedItems: Set<string>, 
  onToggle: (id: string) => void,
  onBack: () => void
}) {
  const allItemsCount = CHECKLIST_DATA.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedCount = checkedItems.size;
  const progress = (checkedCount / allItemsCount) * 100;
  const isComplete = checkedCount === allItemsCount;

  return (
    <div className="space-y-10 py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-blue font-bold text-sm hover:underline w-fit"
        >
          <ChevronLeft size={18} /> Voltar para o Dashboard
        </button>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-brand-blue tracking-tight leading-tight">Checklist Final DS-160</h1>
          <p className="text-lg text-slate-500">Revise cada item antes de enviar seu formulário</p>
        </div>
      </div>

      {/* Progress Bar Fixed Mob/Top */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md py-4 border-b border-slate-100 -mx-4 px-4 md:relative md:bg-white md:border-2 md:border-slate-100 md:rounded-3xl md:p-8 md:m-0 md:shadow-xl md:shadow-slate-200/50">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Seu Progresso Atual</span>
              <span className="text-2xl font-bold text-slate-800">{checkedCount} de {allItemsCount}</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-brand-blue">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-blue'}`}
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="p-10 bg-emerald-500 border-2 border-emerald-400 rounded-[2.5rem] text-center space-y-6 shadow-2xl shadow-emerald-500/30 text-white"
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-xl">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">✅ Tudo pronto!</h2>
              <p className="text-emerald-50 font-medium text-lg max-w-md mx-auto">
                Seu DS-160 foi revisado com sucesso. Você acaba de reduzir drasticamente os riscos de erros fatais. Boa sorte na entrevista!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="grid grid-cols-1 gap-12">
        {CHECKLIST_DATA.map((category) => (
          <div key={category.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-[0.2em] whitespace-nowrap">
                {category.title}
              </h3>
              <div className="h-px bg-slate-100 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.items.map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    className={`
                      group flex items-center gap-5 p-6 rounded-[1.5rem] border-2 transition-all text-left relative overflow-hidden
                      ${isChecked 
                        ? 'bg-emerald-50/50 border-emerald-200 ring-4 ring-emerald-50' 
                        : 'bg-white border-slate-100 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-slate-200/50'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all shadow-sm
                      ${isChecked 
                        ? 'bg-emerald-500 border-emerald-500 text-white scale-110' 
                        : 'border-slate-200 text-transparent group-hover:border-brand-blue/30'}
                    `}>
                      <CheckCircle2 size={18} />
                    </div>
                    <span className={`font-semibold text-lg transition-all ${isChecked ? 'text-emerald-900 line-through opacity-50' : 'text-slate-700'}`}>
                      {item.text}
                    </span>
                    {isChecked && (
                       <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                       />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Support */}
      <div className="pt-20 pb-10 text-center space-y-6">
        <div className="w-16 h-1 bg-slate-100 mx-auto rounded-full" />
        <p className="text-slate-400 font-medium max-w-xs mx-auto">
          Ficou com alguma dúvida técnica sobre um campo? Nosso suporte está à disposição.
        </p>
      </div>
    </div>
  );
}

