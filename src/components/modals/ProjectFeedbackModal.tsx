import React, { useState, useEffect } from 'react';
import { 
  X, Star, CheckCircle2, 
  Sparkles, User, AlertTriangle 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import type { CitizenFeedback } from '../../types';

interface ProjectFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    type: 'Project' | 'Maintenance' | 'Issue';
    department?: string;
    location?: string;
  } | null;
  initialRating?: number;
  existingFeedback?: CitizenFeedback | null;
  onSuccess?: (feedback: CitizenFeedback) => void;
}

const CATEGORIES = [
  'Work Quality & Safety',
  'Timeliness & Completion',
  'Public Access & Impact',
  'Overall Civic Satisfaction'
];

const RATING_LABELS: Record<number, string> = {
  1: '1.0 — Needs Urgent Improvement',
  2: '2.0 — Below Expectations',
  3: '3.0 — Acceptable / Standard',
  4: '4.0 — Good Civic Work',
  5: '5.0 — Outstanding Municipal Quality'
};

export const ProjectFeedbackModal: React.FC<ProjectFeedbackModalProps> = ({
  isOpen,
  onClose,
  item,
  initialRating = 4,
  existingFeedback,
  onSuccess
}) => {
  const { currentUser, profile } = useAuth();

  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [comment, setComment] = useState<string>('');
  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenEmail, setCitizenEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [existingDate, setExistingDate] = useState<string | null>(null);

  // Generate or retrieve persistent guest citizen ID
  const getCitizenIdentifier = () => {
    if (currentUser?.uid) return currentUser.uid;
    let guestId = localStorage.getItem('govasset_citizen_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('govasset_citizen_guest_id', guestId);
    }
    return guestId;
  };

  useEffect(() => {
    if (!isOpen || !item) return;

    // Prefill name & email
    const defaultName = profile?.name || localStorage.getItem('govasset_last_citizen_name') || 'Citizen Auditor';
    const defaultEmail = currentUser?.email || localStorage.getItem('govasset_last_citizen_email') || '';
    setCitizenName(defaultName);
    setCitizenEmail(defaultEmail);
    setError(null);

    // If pre-passed existingFeedback
    if (existingFeedback) {
      setRating(existingFeedback.rating || initialRating);
      setCategory(existingFeedback.category || CATEGORIES[0]);
      setComment(existingFeedback.comment || '');
      setHasExisting(true);
      setExistingDate(existingFeedback.updatedAt ? new Date(existingFeedback.updatedAt).toLocaleDateString() : 'Previously');
      return;
    }

    // Otherwise check Firestore for existing feedback for this user & item
    const checkFirestore = async () => {
      try {
        const identifier = getCitizenIdentifier();
        const docId = `${item.id}_${identifier.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const snap = await getDoc(doc(db, 'citizenFeedback', docId));
        if (snap.exists()) {
          const data = snap.data() as CitizenFeedback;
          setRating(data.rating || initialRating);
          setCategory(data.category || CATEGORIES[0]);
          setComment(data.comment || '');
          setHasExisting(true);
          setExistingDate(data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : 'Previously');
        } else {
          setRating(initialRating);
          setComment('');
          setHasExisting(false);
          setExistingDate(null);
        }
      } catch (err) {
        console.warn('Could not fetch existing feedback from Firestore:', err);
      }
    };

    checkFirestore();
  }, [isOpen, item, existingFeedback, initialRating, currentUser, profile]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const identifier = getCitizenIdentifier();
      const docId = `${item.id}_${identifier.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const nowIso = new Date().toISOString();

      const finalName = citizenName.trim() || 'Citizen Auditor';
      const finalEmail = citizenEmail.trim() || currentUser?.email || 'public-citizen@govasset.org';

      const feedbackData: CitizenFeedback = {
        id: docId,
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        userId: identifier,
        userEmail: finalEmail,
        userName: finalName,
        rating,
        category,
        comment: comment.trim(),
        createdAt: existingFeedback?.createdAt || nowIso,
        updatedAt: nowIso
      };

      // 1. Save to Firestore
      await setDoc(doc(db, 'citizenFeedback', docId), {
        ...feedbackData,
        dbTimestamp: serverTimestamp()
      }, { merge: true });

      // 2. Cache in localStorage for offline & instant reload
      localStorage.setItem(`govasset_review_${item.id}`, JSON.stringify(feedbackData));
      localStorage.setItem('govasset_last_citizen_name', finalName);
      if (finalEmail) {
        localStorage.setItem('govasset_last_citizen_email', finalEmail);
      }

      // Also update local ratings map
      try {
        const savedRatings = JSON.parse(localStorage.getItem('govasset_citizen_ratings') || '{}');
        savedRatings[item.id] = rating;
        localStorage.setItem('govasset_citizen_ratings', JSON.stringify(savedRatings));
      } catch {
        // Ignore
      }

      onSuccess?.(feedbackData);
      onClose();
    } catch (err: any) {
      console.error('Failed to save citizen feedback:', err);
      setError(err.message || 'Failed to submit feedback to database. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Citizen Community Feedback & Review
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
            {item.title}
          </h3>
          <p className="text-xs text-blue-200 mt-1 flex items-center gap-2">
            <span>{item.type}</span>
            {item.location && <span>• {item.location}</span>}
            {item.department && <span>• {item.department}</span>}
          </p>
        </div>

        {/* Existing review banner */}
        {hasExisting && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              You previously rated this work on <strong>{existingDate}</strong>. Updating below will overwrite your record in the database.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Star Rating Selection */}
          <div className="space-y-2 text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Your Public Quality Rating
            </label>

            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none focus:scale-125"
                    title={`Rate ${star} Stars`}
                  >
                    <Star 
                      className={`w-8 h-8 transition-colors ${
                        active 
                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm' 
                          : 'text-slate-300 hover:text-amber-300'
                      }`} 
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-slate-700">
              {RATING_LABELS[hoverRating || rating] || 'Select your rating'}
            </p>
          </div>

          {/* 2. Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Feedback Focus Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 text-left rounded-xl text-xs font-semibold border transition-all ${
                    category === cat
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Review Comment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Observations & Community Comments
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Road surface is smooth, construction barricades were properly placed, completed on time..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* 4. Reviewer Identity (Verified or Guest) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Reviewer Attribution
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {currentUser ? 'Verified Account' : 'Public Citizen'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Your Name (e.g. Sujal Lohar)"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="email"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                placeholder="Your Email (Optional)"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{hasExisting ? 'Update My Review' : 'Submit Citizen Review'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
