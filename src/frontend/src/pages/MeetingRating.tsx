import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, ArrowLeft } from 'lucide-react';

interface MeetingData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingRating: number | null;
  meetingFeedback: string | null;
  ratedAt: string | null;
}

export default function MeetingRating() {
  const { userId, meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadMeetingData();
  }, [userId, meetingId]);

  const loadMeetingData = async () => {
    try {
      const response = await api.get(`/api/rating/${userId}/${meetingId}`);
      setMeeting(response.data.meeting);
      
      // If already rated, populate the form
      if (response.data.meeting.meetingRating) {
        setRating(response.data.meeting.meetingRating);
        setFeedback(response.data.meeting.meetingFeedback || '');
        setSubmitted(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading meeting data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await api.post(`/api/rating/${userId}/${meetingId}`, {
        rating,
        feedback: feedback.trim() || undefined,
      });
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-gray-700 text-xl"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Meeting not found</h2>
          <p className="text-gray-600">This rating link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="rating-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-8 text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="text-6xl text-center mb-4"
                >
                  ✨
                </motion.div>
                <h1 className="text-3xl font-bold text-center mb-2">
                  How did it go?
                </h1>
                <p className="text-center text-orange-100">
                  Take a moment to reflect on your meeting
                </p>
              </div>

              {/* Meeting Info */}
              <div className="p-8">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8">
                  <h2 className="font-semibold text-amber-900 text-lg mb-1">
                    {meeting.title}
                  </h2>
                  <p className="text-amber-700 text-sm">
                    {new Date(meeting.startTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Rating Stars */}
                <div className="mb-8">
                  <label className="block text-gray-700 font-semibold mb-4 text-center text-lg">
                    How would you rate your performance?
                  </label>
                  <div className="flex justify-center gap-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="focus:outline-none transition-transform"
                      >
                        <Star
                          size={48}
                          className={`${
                            star <= (hoverRating || rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          } transition-colors`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center mt-4 text-gray-600"
                    >
                      {rating === 5 && "Outstanding! 🎉"}
                      {rating === 4 && "Great job! 👏"}
                      {rating === 3 && "Good effort! 👍"}
                      {rating === 2 && "Room for improvement 💪"}
                      {rating === 1 && "Let's learn from this 📚"}
                    </motion.p>
                  )}
                </div>

                {/* Feedback */}
                <div className="mb-8">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Any additional thoughts? (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What went well? What could be improved next time?"
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  whileHover={{ scale: rating === 0 ? 1 : 1.02 }}
                  whileTap={{ scale: rating === 0 ? 1 : 0.98 }}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                    rating === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
              >
                <Check size={40} className="text-green-600" />
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Thank you for your feedback!
              </h2>

              <p className="text-gray-600 text-lg mb-8">
                Your reflection helps you grow and improve with every meeting.
              </p>

              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[...Array(rating)].map((_, i) => (
                    <Star key={i} size={24} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 font-medium">
                  You rated this meeting {rating} out of 5 stars
                </p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

