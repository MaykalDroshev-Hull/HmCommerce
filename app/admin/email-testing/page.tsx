'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { 
  Mail, 
  MailCheck, 
  Send, 
  Eye, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  X, 
  Server, 
  ShieldCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface TemplateMetadata {
  id: string;
  name: string;
  category: 'Orders' | 'Marketing' | 'Account';
  description: string;
  defaultSubject: string;
}

interface EmailStatus {
  isConfigured: boolean;
  provider: 'resend' | 'gmail' | 'none';
  senderEmail: string | null;
  fromName: string;
  contactEmail: string;
  adminNotificationEmails: string[];
}

interface TestLogEntry {
  id: string;
  templateId: string;
  templateName: string;
  recipient: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
}

export default function AdminEmailTestingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Email Config and Templates State
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // User input & selection
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Orders' | 'Marketing' | 'Account'>('All');
  
  // Action states
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Preview Modal state
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMetadata | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject: string; html: string } | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  // Test session log
  const [testLogs, setTestLogs] = useState<TestLogEntry[]>([]);

  // Page title
  useEffect(() => {
    document.title = 'Email Testing & Previews | Admin Panel';
  }, []);

  // Check Admin Authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Load recipient email from localStorage or session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRecipient = localStorage.getItem('admin_email_test_recipient');
      if (savedRecipient) {
        setRecipientEmail(savedRecipient);
      } else {
        const adminEmail = localStorage.getItem('admin_user_email');
        if (adminEmail) {
          setRecipientEmail(adminEmail);
        }
      }
    }
  }, []);

  // Save recipient to localStorage on change
  const handleRecipientChange = (val: string) => {
    setRecipientEmail(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_email_test_recipient', val.trim());
    }
  };

  // Quick fill admin email
  const handleUseMyEmail = () => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('admin_user_email') || status?.adminNotificationEmails?.[0] || '';
      if (email) {
        handleRecipientChange(email);
      }
    }
  };

  // Fetch status and templates
  const loadStatusAndTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/email-testing');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setTemplates(data.templates || []);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load email testing configuration' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Unable to connect to email testing API' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStatusAndTemplates();
    }
  }, [isAuthenticated, loadStatusAndTemplates]);

  // Send single test email
  const handleSendTest = async (template: TemplateMetadata) => {
    const targetEmail = recipientEmail.trim();
    if (!targetEmail) {
      setFeedback({ type: 'error', message: 'Please provide a recipient email address first.' });
      return;
    }

    try {
      setSendingId(template.id);
      setFeedback(null);

      const res = await fetch('/api/admin/email-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          templateId: template.id,
          toEmail: targetEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          message: `Successfully dispatched "${template.name}" test email to ${targetEmail}!` 
        });

        // Add to session log
        setTestLogs((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            templateId: template.id,
            templateName: template.name,
            recipient: targetEmail,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'success',
            message: 'Delivered to mail server',
          },
          ...prev,
        ]);
      } else {
        const errorMsg = data.error || 'Failed to send test email';
        setFeedback({ type: 'error', message: errorMsg });

        setTestLogs((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            templateId: template.id,
            templateName: template.name,
            recipient: targetEmail,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'error',
            message: errorMsg,
          },
          ...prev,
        ]);
      }
    } catch {
      const errorMsg = 'Network error while attempting to send test email';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setSendingId(null);
    }
  };

  // Batch send all filtered templates
  const handleBatchSend = async () => {
    const targetEmail = recipientEmail.trim();
    if (!targetEmail) {
      setFeedback({ type: 'error', message: 'Please enter a recipient email address.' });
      return;
    }

    const filtered = filteredTemplates;
    if (filtered.length === 0) return;

    if (!confirm(`Are you sure you want to send ${filtered.length} test emails to ${targetEmail}?`)) {
      return;
    }

    setBatchSending(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const template of filtered) {
      try {
        const res = await fetch('/api/admin/email-testing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            templateId: template.id,
            toEmail: targetEmail,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          setTestLogs((prev) => [
            {
              id: Math.random().toString(36).substring(2, 9),
              templateId: template.id,
              templateName: template.name,
              recipient: targetEmail,
              timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              status: 'success',
              message: 'Delivered to mail server',
            },
            ...prev,
          ]);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBatchSending(false);
    if (failCount === 0) {
      setFeedback({ 
        type: 'success', 
        message: `All ${successCount} test emails were dispatched successfully to ${targetEmail}.` 
      });
    } else {
      setFeedback({ 
        type: 'error', 
        message: `Dispatched ${successCount} emails, but ${failCount} failed. Check server configuration.` 
      });
    }
  };

  // Open Live Preview
  const handleOpenPreview = async (template: TemplateMetadata) => {
    setPreviewTemplate(template);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      const res = await fetch('/api/admin/email-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateId: template.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewData({ subject: data.subject, html: data.html });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to render email preview' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to request live preview' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  if (isAuthLoading || loading) {
    return (
      <AdminLayout currentPath="/admin/email-testing">
        <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-stone-500">
            <RefreshCw className="w-8 h-8 animate-spin text-stone-900" />
            <p className="text-sm font-medium tracking-wide">Loading email test environment...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPath="/admin/email-testing">
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-900 text-white rounded-lg">
                <MailCheck className="w-5 h-5" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-stone-950">
                Email Testing & Previews
              </h1>
            </div>
            <p className="text-sm text-stone-500 mt-1 max-w-2xl">
              Inspect responsive email templates in real-time or dispatch genuine test messages to any address across all customer and administrative workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStatusAndTemplates}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-medium leading-relaxed">{feedback.message}</p>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status & Service Configuration Pill Card */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Service Provider State */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-xs">
                <Server className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-stone-400">
                  Email Provider
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {status?.isConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {status.provider === 'resend' ? 'Resend Active' : 'Gmail SMTP Active'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Previews Only (Unconfigured)
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {status?.isConfigured 
                    ? 'Server credentials verified & ready to send.' 
                    : 'Set RESEND_API_KEY in .env.local to send live emails.'}
                </p>
              </div>
            </div>

            {/* Sender Identity */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-xs">
                <ShieldCheck className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-stone-400">
                  Sender Identity
                </div>
                <div className="text-sm font-semibold text-stone-900 mt-1 truncate">
                  {status?.fromName || 'MB-Paws'} &lt;{status?.senderEmail || 'noreply@store.com'}&gt;
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Public Contact: <span className="font-mono text-stone-600">{status?.contactEmail}</span>
                </p>
              </div>
            </div>

            {/* Admin Notifications */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-xs">
                <Mail className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-stone-400">
                  Admin Dispatch Target
                </div>
                <div className="text-sm font-semibold text-stone-900 mt-1 truncate">
                  {status?.adminNotificationEmails?.join(', ') || 'Not set'}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Receives internal store notifications & alerts.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Recipient Input Control Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <label htmlFor="test-recipient" className="block text-sm font-bold text-stone-900">
                Target Recipient Email Address
              </label>
              <p className="text-xs text-stone-500 mt-0.5">
                All test actions on this page will deliver to this specific address. Saved automatically for this browser.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseMyEmail}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                Use Admin Email
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="test-recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="e.g. petparent@example.co.uk"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition font-mono"
              />
            </div>

            <button
              onClick={handleBatchSend}
              disabled={batchSending || !recipientEmail.trim() || !status?.isConfigured}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition ${
                batchSending || !recipientEmail.trim() || !status?.isConfigured
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs'
              }`}
            >
              {batchSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Dispatching Batch...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Test All in Category ({filteredTemplates.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-px">
          {(['All', 'Orders', 'Marketing', 'Account'] as const).map((category) => {
            const count = category === 'All' 
              ? templates.length 
              : templates.filter((t) => t.category === category).length;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
                  isSelected
                    ? 'border-stone-900 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
              >
                <span>{category === 'All' ? 'All Templates' : category}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((template) => {
            const isSending = sendingId === template.id;
            const recentTest = testLogs.find((l) => l.templateId === template.id);

            return (
              <div
                key={template.id}
                className="bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-md bg-stone-100 text-stone-700 uppercase tracking-wider">
                      {template.category}
                    </span>

                    {recentTest && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent at {recentTest.timestamp}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-stone-950">
                      {template.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200/60 rounded-lg p-2.5 text-xs text-stone-600">
                    <span className="font-semibold text-stone-400 block uppercase tracking-wider text-[10px]">
                      Subject Line Preview
                    </span>
                    <span className="font-medium text-stone-800 truncate block mt-0.5">
                      {template.defaultSubject}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-5 mt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(template)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-800 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 hover:border-stone-400 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendTest(template)}
                    disabled={isSending || batchSending || !recipientEmail.trim() || !status?.isConfigured}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                      isSending || batchSending || !recipientEmail.trim() || !status?.isConfigured
                        ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                        : 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs'
                    }`}
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Session Log Section */}
        {testLogs.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <h3 className="text-sm font-bold text-stone-900">
                  Recent Test Deliveries (This Session)
                </h3>
              </div>
              <button
                onClick={() => setTestLogs([])}
                className="text-xs text-stone-400 hover:text-stone-700 transition"
              >
                Clear Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Time</th>
                    <th className="pb-2.5">Template</th>
                    <th className="pb-2.5">Recipient</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {testLogs.map((log) => (
                    <tr key={log.id} className="text-stone-700">
                      <td className="py-2.5 text-stone-500">{log.timestamp}</td>
                      <td className="py-2.5 font-sans font-medium text-stone-900">{log.templateName}</td>
                      <td className="py-2.5">{log.recipient}</td>
                      <td className="py-2.5">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-sans font-bold text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-stone-500 truncate max-w-xs">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-4 bg-stone-50/50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-stone-200 text-stone-700">
                      {previewTemplate.category}
                    </span>
                    <h2 className="text-base font-bold text-stone-950 truncate">
                      {previewTemplate.name}
                    </h2>
                  </div>
                  {previewData?.subject && (
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      Subject: <span className="font-semibold text-stone-800">{previewData.subject}</span>
                    </p>
                  )}
                </div>

                {/* Viewport Toggle and Close */}
                <div className="flex items-center gap-2">
                  <div className="bg-stone-200/80 p-1 rounded-lg flex items-center gap-1">
                    <button
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1.5 rounded-md transition ${
                        previewViewport === 'desktop'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                      title="Desktop View (Full Width)"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1.5 rounded-md transition ${
                        previewViewport === 'mobile'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                      title="Mobile View (375px)"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Iframe */}
              <div className="flex-1 bg-stone-100 p-4 sm:p-6 overflow-auto flex justify-center items-start">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-stone-400 gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-stone-800" />
                    <p className="text-xs font-semibold">Generating HTML preview...</p>
                  </div>
                ) : previewData?.html ? (
                  <div
                    className={`bg-white shadow-md border border-stone-200 rounded-xl overflow-hidden transition-all duration-300 ${
                      previewViewport === 'mobile' ? 'w-[375px] min-h-[640px]' : 'w-full max-w-[680px] min-h-[580px]'
                    }`}
                  >
                    <iframe
                      title="Email Preview"
                      srcDoc={previewData.html}
                      className="w-full h-[620px] border-0"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">Preview could not be loaded.</p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-500">
                  Target: <span className="font-mono font-semibold text-stone-800">{recipientEmail.trim() || 'No address set'}</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (previewTemplate) {
                        handleSendTest(previewTemplate);
                      }
                    }}
                    disabled={sendingId === previewTemplate.id || !recipientEmail.trim() || !status?.isConfigured}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                      sendingId === previewTemplate.id || !recipientEmail.trim() || !status?.isConfigured
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    {sendingId === previewTemplate.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send This Email Now
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
