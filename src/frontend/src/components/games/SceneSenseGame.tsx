import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../lib/axios';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: number;
  microTeach: string;
}

interface SceneSenseGameProps {
  onComplete: (credits: number, streak: number) => void;
}

export default function SceneSenseGame({ onComplete }: SceneSenseGameProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showMicroTeach, setShowMicroTeach] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [creditsEarned, setCreditsEarned] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await api.get('/api/games/scene-sense/questions?count=5');
      const questions = response.data.questions || [];
      
      if (questions.length === 0) {
        console.error('No questions available. Attempting to seed database...');
        // Try to seed the database
        try {
          await api.post('/api/games/seed');
          // Reload questions after seeding
          const retryResponse = await api.get('/api/games/scene-sense/questions?count=5');
          const retryQuestions = retryResponse.data.questions || [];
          if (retryQuestions.length > 0) {
            setQuestions(retryQuestions);
            setLoading(false);
            return;
          }
        } catch (seedError) {
          console.error('Error seeding games:', seedError);
        }
        setLoading(false);
        return;
      }
      
      setQuestions(questions);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);

    const currentQuestion = questions[currentIndex];
    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      setScore(score + 1);
    }

    // Submit answer to backend
    api.post('/api/games/scene-sense/submit', {
      questionId: currentQuestion.id,
      userAnswer: index,
      isCorrect,
    }).catch(console.error);
  };

  const handleNext = () => {
    if (showMicroTeach) {
      // Move to next question
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setShowMicroTeach(false);
      } else {
        // Game complete
        finishGame();
      }
    } else {
      // Show micro-teaching
      setShowMicroTeach(true);
    }
  };

  const finishGame = async () => {
    const perfectScore = score === questions.length;
    const totalCredits = score + (perfectScore ? 2 : 0); // 1 per correct + 2 bonus for perfect

    try {
      const response = await api.post('/api/games/scene-sense/submit', {
        questionId: questions[questions.length - 1].id,
        userAnswer: selectedAnswer,
        isCorrect: selectedAnswer === questions[questions.length - 1].correctIndex,
        perfectScore,
      });

      setCreditsEarned(totalCredits);
      setGameComplete(true);

      // Call onComplete after a delay to show results
      setTimeout(() => {
        onComplete(totalCredits, response.data.streak || 0);
      }, 3000);
    } catch (error) {
      console.error('Error finishing game:', error);
      onComplete(totalCredits, 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Game Complete!</h2>
          <p className="text-xl text-gray-600 mb-4">
            Score: {score} / {questions.length}
          </p>
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-semibold">+{creditsEarned} Credits</span>
          </div>
          <p className="text-gray-500">Returning to Games Hub...</p>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Questions Available</h2>
          <p className="text-gray-600 mb-4">
            The game database hasn't been seeded yet. Please contact support or check the backend logs.
          </p>
          <button
            onClick={() => window.location.href = '/games'}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Games Hub
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              className="bg-gradient-to-r from-indigo-600 to-teal-600 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {currentIndex + 1}
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">{currentQuestion.category}</p>
              <p className="text-xs text-gray-400">Difficulty: {currentQuestion.difficulty}/5</p>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8">
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === currentQuestion.correctIndex;
              const showResult = showFeedback && (isSelected || isCorrectOption);

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showResult
                      ? isCorrectOption
                        ? 'border-green-500 bg-green-50'
                        : isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                    {showResult && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {isCorrectOption ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : isSelected ? (
                          <XCircle className="w-6 h-6 text-red-500" />
                        ) : null}
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Micro Teaching */}
        <AnimatePresence>
          {showMicroTeach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-indigo-50 to-teal-50 rounded-2xl p-6 sm:p-8 mb-6 border-l-4 border-indigo-500"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Micro-Teaching</h3>
              <p className="text-gray-700 leading-relaxed italic">
                {currentQuestion.microTeach}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button */}
        {showFeedback && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center gap-3 mx-auto"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

