import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { finalizeScan } from '../lib/api';

const questions = [
{
  id: 'functional',
  title: 'Is the item still functional?',
  description:
  'Can it still perform its primary purpose without major repairs?',
  options: [
  {
    value: 'yes',
    label: 'Yes, fully functional'
  },
  {
    value: 'partial',
    label: 'Partially functional'
  },
  {
    value: 'no',
    label: 'No, completely broken'
  }]

},
{
  id: 'clean',
  title: 'Is it clean?',
  description:
  'Is it free from food residue, hazardous chemicals, or heavy dirt?',
  options: [
  {
    value: 'yes',
    label: 'Yes, clean'
  },
  {
    value: 'needs_cleaning',
    label: 'Needs minor cleaning'
  },
  {
    value: 'no',
    label: 'No, heavily soiled'
  }]

},
{
  id: 'parts',
  title: 'Are any parts missing?',
  description: 'Does it have all its original components?',
  options: [
  {
    value: 'no',
    label: 'All parts present'
  },
  {
    value: 'minor',
    label: 'Minor parts missing'
  },
  {
    value: 'major',
    label: 'Major components missing'
  }]

}];

export function Validate() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const scanId = state.scanId;
  const imageUrl = state.imageUrl;
  const imageBase64 = state.imageBase64;  // real base64 for Gemini
  const prefillAnswers = state.prefillAnswers || {};
  
  // Use dynamic questions if passed in router state, otherwise fall back to static/mock questions
  const questionsToUse = state.questions && state.questions.length > 0 ? state.questions : questions;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(prefillAnswers);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questionsToUse[currentStep];
  const progress = questionsToUse.length > 0 ? ((currentStep + 1) / questionsToUse.length * 100) : 0;
  const isLastStep = questionsToUse.length > 0 ? (currentStep === questionsToUse.length - 1) : true;
  const hasAnsweredCurrent = question ? !!answers[question.id] : false;

  const handleNext = async () => {
    if (isLastStep) {
      setIsFinalizing(true);
      setError(null);
      try {
        // Send answers to final analysis endpoint — pass imageBase64 so Gemini can run real analysis
        const analysisResult = await finalizeScan(scanId, answers, imageBase64 || imageUrl);
        navigate('/analysis', {
          state: {
            analysis: analysisResult,
            imageUrl: imageUrl
          }
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Analysis finalization failed. Please try again.');
        setIsFinalizing(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      navigate('/scan');
    }
  };

  if (isFinalizing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-3xl p-8 shadow-sm border border-border/50 flex flex-col items-center justify-center min-h-[350px]">
          <div className="w-16 h-16 rounded-full border-4 border-[#2F6B5F]/20 border-t-[#2F6B5F] animate-spin mb-6" />
          <h2 className="font-heading text-2xl font-bold text-[#1B1F1D] mb-3">
            Generating Analysis...
          </h2>
          <p className="text-[#66706A] text-sm">
            Resiklo AI is analyzing your image and survey responses to create personalized recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white border border-border/50 flex items-center justify-center text-[#66706A] hover:text-[#1B1F1D] hover:bg-gray-50 transition-colors shadow-sm">
            
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-mono text-xs font-bold text-[#66706A] uppercase tracking-widest">
            Step {currentStep + 1} of {questionsToUse.length}
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-1.5 bg-black/5" />
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border/50 relative overflow-hidden min-h-[400px] flex flex-col">
          {error && (
            <div className="mb-6 p-4 bg-[#C65B4B]/10 border border-[#C65B4B]/20 text-[#C65B4B] rounded-2xl text-sm flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="ghost" onClick={() => setError(null)} className="text-[#C65B4B] hover:bg-[#C65B4B]/10 p-1 h-auto">
                Dismiss
              </Button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -20
              }}
              transition={{
                duration: 0.3
              }}
              className="flex-1 flex flex-col">
              
              <div className="mb-8">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#1B1F1D] mb-3">
                  {question.title}
                </h2>
                <p className="text-[#66706A]">{question.description}</p>
              </div>

              <div className="space-y-3 flex-1">
                {question.options.map((option: { value: string; label: string }) => {
                  const isSelected = answers[question.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: option.value
                      }))
                      }
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${isSelected ? 'border-[#2F6B5F] bg-[#2F6B5F]/5' : 'border-border/50 hover:border-[#2F6B5F]/30 hover:bg-gray-50'}`}>
                      
                      <span
                        className={`font-medium ${isSelected ? 'text-[#2F6B5F]' : 'text-[#1B1F1D]'}`}>
                        
                        {option.label}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#2F6B5F] bg-[#2F6B5F]' : 'border-gray-300 group-hover:border-[#2F6B5F]/50'}`}>
                        
                        {isSelected &&
                        <Check className="w-3.5 h-3.5 text-white" />
                        }
                      </div>
                    </button>);

                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-border/50">
            <Button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent}
              className="w-full h-14 rounded-xl bg-[#1B1F1D] text-white hover:bg-[#1B1F1D]/90 text-base">
              
              {isLastStep ? 'Generate Analysis' : 'Next Question'}
              {!isLastStep && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>);

}