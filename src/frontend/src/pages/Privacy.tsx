import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
            <div className="text-3xl" role="img" aria-label="Film camera emoji">🎬</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Meet Cute
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: November 1, 2025</p>

          <div className="prose prose-indigo max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our meeting 
                preparation platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-gray-800">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Email address, name (from OAuth providers)</li>
                <li><strong>Settings & Preferences:</strong> Tone preferences, alert timing, notification settings</li>
                <li><strong>Feedback:</strong> Meeting ratings, optional text feedback, journal entries</li>
                <li><strong>Contact Information:</strong> Phone number (optional, for SMS notifications)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-gray-800">2.2 Calendar Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you connect your calendar, we access:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Meeting titles</li>
                <li>Start and end times</li>
                <li>Attendee email addresses</li>
                <li>Meeting descriptions and locations</li>
                <li>Meeting links (Zoom, Teams, etc.)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-gray-800">2.3 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Usage Data:</strong> Which features you use, when you open Focus Scenes, meeting preparation patterns</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
                <li><strong>OAuth Tokens:</strong> Access and refresh tokens for calendar integration (encrypted)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Provide the Service:</strong> Send pre-meeting cues, evening rehearsals, and morning recaps</li>
                <li><strong>Personalization:</strong> Use AI to generate content tailored to your meeting history and preferences</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and fix bugs</li>
                <li><strong>Communication:</strong> Send service updates, notifications, and support responses</li>
                <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security issues</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. AI and Data Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>OpenAI GPT-4:</strong> We use OpenAI's API to generate personalized meeting preparation content. 
                The data we send includes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Meeting titles and times (never full descriptions)</li>
                <li>Your tone preferences</li>
                <li>Historical meeting ratings (aggregated patterns, not specific feedback)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                OpenAI does not use data submitted via their API to train their models. See OpenAI's privacy policy 
                for more details.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do NOT sell your personal information. We share data only with:
              </p>
              
              <h3 className="text-xl font-semibold mb-3 text-gray-800">5.1 Service Providers</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Railway:</strong> Hosting and infrastructure</li>
                <li><strong>OpenAI:</strong> AI content generation</li>
                <li><strong>SendGrid:</strong> Email delivery</li>
                <li><strong>Twilio:</strong> SMS delivery (if you enable SMS)</li>
                <li><strong>Google/Microsoft:</strong> Calendar access via OAuth</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-gray-800">5.2 Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may disclose your information if required by law, court order, or government request.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement industry-standard security measures:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> Data in transit (HTTPS/TLS) and at rest</li>
                <li><strong>OAuth Tokens:</strong> Encrypted storage with secure refresh mechanisms</li>
                <li><strong>Access Controls:</strong> Restricted database and system access</li>
                <li><strong>Regular Updates:</strong> Security patches and monitoring</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your information for as long as your account is active or as needed to provide services. 
                Specifically:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Calendar Events:</strong> Stored only for upcoming and recent meetings (30-day history)</li>
                <li><strong>Meeting Ratings:</strong> Retained to improve AI personalization (last 10 ratings used)</li>
                <li><strong>Account Data:</strong> Deleted within 30 days of account deletion</li>
                <li><strong>Logs:</strong> System logs retained for 90 days for security and debugging</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Access:</strong> Request a copy of your data</li>
                <li><strong>Correction:</strong> Update inaccurate information</li>
                <li><strong>Deletion:</strong> Request account and data deletion</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Disable specific notifications or features</li>
                <li><strong>Revoke Access:</strong> Disconnect calendar integration at any time</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                To exercise these rights, contact us at <a href="mailto:privacy@meetcuteai.com" className="text-indigo-600 hover:text-indigo-700">privacy@meetcuteai.com</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use essential cookies for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Authentication:</strong> Session management and login persistence</li>
                <li><strong>Preferences:</strong> Storing your settings and preferences</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do NOT use advertising or tracking cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Meet Cute is not intended for children under 13. We do not knowingly collect information from 
                children under 13. If you believe we have collected such information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. International Users</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you access Meet Cute from outside the United States, your information may be transferred to, 
                stored, and processed in the United States where our servers are located.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">12. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of material changes via 
                email or through the Service. The "Last Updated" date will reflect when changes were made.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">13. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our data practices:
              </p>
              <p className="text-gray-700 leading-relaxed">
                Email: <a href="mailto:privacy@meetcuteai.com" className="text-indigo-600 hover:text-indigo-700">privacy@meetcuteai.com</a><br />
                Support: <a href="mailto:support@meetcuteai.com" className="text-indigo-600 hover:text-indigo-700">support@meetcuteai.com</a><br />
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
          <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
          <span>·</span>
          <a href="mailto:support@meetcuteai.com" className="hover:text-indigo-600 transition-colors">Contact</a>
        </div>
        <p className="text-sm">© 2025 Meet Cute. All rights reserved.</p>
      </footer>
    </div>
  );
}

