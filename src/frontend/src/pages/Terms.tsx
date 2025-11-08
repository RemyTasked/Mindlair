import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LOGO_PATHS } from '../config/constants';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_PATHS.main} 
              alt="Meet Cute Logo" 
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Meet Cute
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Terms of Use</h1>
          <p className="text-gray-600 mb-8">Last Updated: November 1, 2025</p>

          <div className="prose prose-indigo max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing and using Meet Cute ("the Service"), you accept and agree to be bound by the terms and 
                provisions of this agreement. If you do not agree to these Terms of Use, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute is an AI-enhanced meeting preparation platform that provides:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Evening mental rehearsal sessions (Presley Flow)</li>
                <li>Morning confidence messages</li>
                <li>Pre-meeting focus cues</li>
                <li>Guided meditation and breathing exercises</li>
                <li>Post-meeting reflection and ratings</li>
                <li>Calendar integration with Google Calendar and Microsoft Outlook</li>
                <li>Email and SMS notification delivery</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To use Meet Cute, you must authenticate using either Google or Microsoft OAuth. You are responsible for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Calendar Access</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By connecting your calendar, you grant Meet Cute permission to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Read your calendar events (title, time, attendees, description)</li>
                <li>Send you notifications about upcoming meetings</li>
                <li>Store meeting metadata for AI personalization</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We will never modify, delete, or create calendar events without your explicit action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. AI and Data Usage</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute uses AI (OpenAI GPT-4) to generate personalized content. By using the Service:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>You consent to AI processing of your meeting metadata</li>
                <li>Meeting titles, times, and your ratings are used to improve personalization</li>
                <li>AI-generated content is unique to you and not shared with other users</li>
                <li>Your feedback helps the AI learn your preferences over time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to reverse engineer or compromise the Service</li>
                <li>Use automated scripts or bots to access the Service</li>
                <li>Share your account credentials with others</li>
                <li>Abuse or overload our servers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute integrates with third-party services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Google Calendar & Microsoft Outlook:</strong> For calendar access</li>
                <li><strong>SendGrid:</strong> For email delivery</li>
                <li><strong>Twilio:</strong> For SMS notifications (optional)</li>
                <li><strong>OpenAI:</strong> For AI content generation</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your use of these services is subject to their respective terms and privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service, including all content, features, and functionality, is owned by Meet Cute and is 
                protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Disclaimer of Warranties</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 
                Meet Cute does not guarantee that the Service will be uninterrupted, secure, or error-free.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Note:</strong> Meet Cute is a productivity tool, not a substitute for professional mental 
                health services. If you're experiencing stress or anxiety, please consult a qualified professional.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute shall not be liable for any indirect, incidental, special, consequential, or punitive 
                damages resulting from your use or inability to use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your access to the Service at any time, with or without 
                notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may discontinue use at any time by disconnecting your calendar and deleting your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">12. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update these Terms from time to time. We will notify users of any material changes via 
                email or through the Service. Your continued use after such changes constitutes acceptance of the 
                updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">13. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">14. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <p className="text-gray-700 leading-relaxed">
                Email: <a href="mailto:support@meetcuteai.com" className="text-indigo-600 hover:text-indigo-700">support@meetcuteai.com</a><br />
                Website: <a href="https://www.meetcuteai.com" className="text-indigo-600 hover:text-indigo-700">www.meetcuteai.com</a>
              </p>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <a href="/" className="hover:text-indigo-600 transition-colors">Home</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="mailto:support@meetcuteai.com" className="hover:text-indigo-600 transition-colors">Contact</a>
        </div>
        <p className="text-sm">© 2025 Meet Cute. All rights reserved.</p>
      </footer>
    </div>
  );
}

