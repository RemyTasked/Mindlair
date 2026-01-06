import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, Database, Key, UserCheck, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Privacy & Security</h1>
            </div>
            <div className="flex items-center gap-2">
              <Logo size="lg" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-50 rounded-2xl p-8 mb-12 border border-teal-200">
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 text-teal-600 flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Your Privacy is Our Priority
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                Mind Garden is designed with security-first principles. We only access what we need, 
                encrypt everything, and never sell your data. Your calendar and meeting information 
                stay private and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="space-y-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900">Security Features</h3>
          
          <SecurityFeature
            icon={<Lock className="w-8 h-8 text-green-600" />}
            title="End-to-End Encryption"
            description="All data transmitted between your browser and our servers uses industry-standard TLS 1.3 encryption. Your calendar data is encrypted at rest in our database."
          />

          <SecurityFeature
            icon={<Key className="w-8 h-8 text-blue-600" />}
            title="OAuth 2.0 Authentication"
            description="We use Google and Microsoft's official OAuth 2.0 protocols. We never see or store your password. You can revoke access anytime from your Google/Microsoft account settings."
          />

          <SecurityFeature
            icon={<Eye className="w-8 h-8 text-teal-600" />}
            title="Read-Only Calendar Access"
            description="We only request read-only access to your calendar. We cannot create, modify, or delete any of your meetings or calendar events."
          />

          <SecurityFeature
            icon={<Database className="w-8 h-8 text-teal-600" />}
            title="Minimal Data Storage"
            description="We only store meeting titles, times, and attendee counts—nothing sensitive. No meeting notes, attachments, or private details are ever stored."
          />

          <SecurityFeature
            icon={<UserCheck className="w-8 h-8 text-teal-600" />}
            title="SOC 2 Compliant Infrastructure"
            description="Hosted on Railway with PostgreSQL, following industry best practices for security, availability, and confidentiality."
          />

          <SecurityFeature
            icon={<Shield className="w-8 h-8 text-red-600" />}
            title="Regular Security Audits"
            description="We perform regular security reviews and keep all dependencies up-to-date to protect against vulnerabilities."
          />
        </div>

        {/* What We Access */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">What We Access</h3>
          
          <div className="space-y-4">
            <AccessItem
              allowed={true}
              title="Meeting titles and times"
              description="To generate personalized pre-meeting cues"
            />
            <AccessItem
              allowed={true}
              title="Number of attendees"
              description="To tailor preparation advice (1:1 vs team meeting)"
            />
            <AccessItem
              allowed={true}
              title="Meeting duration"
              description="To provide appropriate timing for focus sessions"
            />
            <AccessItem
              allowed={false}
              title="Meeting content or notes"
              description="We never access the actual content of your meetings"
            />
            <AccessItem
              allowed={false}
              title="Email content"
              description="We only send emails TO you, never read your inbox"
            />
            <AccessItem
              allowed={false}
              title="Contact information"
              description="We don't access your contacts or attendee email addresses"
            />
          </div>
        </div>

        {/* Data Practices */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Data Practices</h3>
          
          <div className="space-y-6">
            <DataPractice
              title="We Never Sell Your Data"
              description="Your information is never sold, rented, or shared with third parties for marketing purposes. Period."
            />
            <DataPractice
              title="You Own Your Data"
              description="You can export or delete all your data at any time. When you delete your account, we permanently remove all your information within 30 days."
            />
            <DataPractice
              title="Transparent AI Usage"
              description="We use OpenAI and Google Gemini to generate personalized messages. Only meeting titles and context are sent—never sensitive content."
            />
            <DataPractice
              title="No Third-Party Tracking"
              description="We don't use Google Analytics, Facebook Pixel, or other tracking scripts. Your browsing behavior stays private."
            />
            <DataPractice
              title="GDPR & CCPA Compliant"
              description="We comply with international privacy regulations including GDPR (Europe) and CCPA (California)."
            />
          </div>
        </div>

        {/* Revoking Access */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 mb-12 border border-amber-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Revoking Access</h3>
          <p className="text-gray-700 mb-4">
            You can revoke Mind Garden's access to your calendar at any time:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Google:</span>
              <span>Visit <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">myaccount.google.com/permissions</a> → Find "Mind Garden" → Remove Access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Microsoft:</span>
              <span>Visit <a href="https://account.microsoft.com/privacy/app-access" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">account.microsoft.com/privacy</a> → Apps & Services → Remove Mind Garden</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Mind Garden:</span>
              <span>Settings → Delete Account (permanently removes all data)</span>
            </li>
          </ul>
        </div>

        {/* Mental Health Disclaimer */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <UserCheck className="w-10 h-10 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Important Health Disclaimer</h3>
              <p className="text-lg font-semibold text-amber-800">
                Mind Garden is a Professional Tool, Not Medical Care
              </p>
            </div>
          </div>
          
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              <strong>Mind Garden is designed to help you prepare mentally for meetings and improve your focus.</strong> 
              It is a productivity and wellness tool that provides AI-generated suggestions for meeting preparation, 
              breathing exercises, and reflection prompts.
            </p>
            
            <div className="bg-white p-5 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-900 mb-3">This tool is NOT:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>A substitute for professional mental health care, therapy, or counseling</li>
                <li>Medical advice or treatment for mental health conditions</li>
                <li>A diagnostic tool for anxiety, depression, or other mental health conditions</li>
                <li>A replacement for crisis intervention or emergency mental health services</li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-900 mb-3">If you are experiencing:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Persistent anxiety, stress, or depression</li>
                <li>Thoughts of self-harm or suicide</li>
                <li>Difficulty functioning in daily life</li>
                <li>Any mental health crisis</li>
              </ul>
              <p className="font-semibold mt-4 text-gray-900">
                Please seek help from a qualified mental health professional immediately.
              </p>
            </div>

            <div className="bg-red-50 p-5 rounded-lg border-2 border-red-300">
              <p className="font-bold text-red-900 mb-3">🆘 Crisis Resources:</p>
              <ul className="space-y-2 text-gray-800">
                <li>🇺🇸 <strong>National Suicide Prevention Lifeline:</strong> <a href="tel:988" className="text-teal-600 hover:underline font-semibold">988</a></li>
                <li>🇺🇸 <strong>Crisis Text Line:</strong> Text HOME to <a href="sms:741741" className="text-teal-600 hover:underline font-semibold">741741</a></li>
                <li>🌍 <strong>International:</strong> <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-semibold">findahelpline.com</a></li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 italic bg-white p-4 rounded-lg border border-gray-200">
              <strong>By using Mind Garden, you acknowledge that:</strong> This tool is for professional productivity 
              and should not replace proper mental health care when needed. Always consult qualified healthcare 
              providers for medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Questions or Concerns?</h3>
          <p className="text-gray-700 mb-4">
            We're committed to transparency and protecting your privacy. If you have any questions 
            about our security practices or data handling:
          </p>
          <div className="space-y-2">
            <p className="text-gray-700">
              <strong>Email:</strong> <a href="mailto:privacy@mind-garden.app" className="text-teal-600 hover:underline">privacy@mind-garden.app</a>
            </p>
            <p className="text-gray-700">
              <strong>Security Issues:</strong> <a href="mailto:security@mind-garden.app" className="text-teal-600 hover:underline">security@mind-garden.app</a>
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            Last updated: November 3, 2025
          </p>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <a href="/" className="hover:text-emerald-600 transition-colors">Home</a>
            <span>·</span>
            <a href="/terms" className="hover:text-emerald-600 transition-colors">Terms of Use</a>
          </div>
        </div>
      </main>
    </div>
  );
}

function SecurityFeature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function AccessItem({ allowed, title, description }: { allowed: boolean; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${allowed ? 'bg-green-100' : 'bg-red-100'}`}>
        {allowed ? (
          <span className="text-green-600 text-sm font-bold">✓</span>
        ) : (
          <span className="text-red-600 text-sm font-bold">✗</span>
        )}
      </div>
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}

function DataPractice({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">✓ {title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
