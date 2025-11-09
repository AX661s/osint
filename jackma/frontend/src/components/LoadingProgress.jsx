import React, { useState, useEffect } from 'react';
import { Shield, Database, Globe, Zap } from 'lucide-react';

export const LoadingProgress = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Shield, label: 'Initializing Security Scan', delay: 0 },
    { icon: Database, label: 'Querying Databases', delay: 200 },
    { icon: Globe, label: 'Scanning Platforms', delay: 400 },
    { icon: Zap, label: 'Analyzing Results', delay: 600 },
  ];

  useEffect(() => {
    let progressInterval;
    let stepInterval;
    let completeTimeout;
    let isMounted = true;

    // Simulate progress
    progressInterval = setInterval(() => {
      if (!isMounted) return;
      setProgress(prev => {
        if (prev >= 100) {
          if (progressInterval) clearInterval(progressInterval);
          if (isMounted && onComplete) {
            completeTimeout = setTimeout(() => {
              if (isMounted && onComplete) {
                try {
                  onComplete();
                } catch (error) {
                  console.error('Error in onComplete callback:', error);
                }
              }
            }, 300);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Update steps
    stepInterval = setInterval(() => {
      if (!isMounted) return;
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          if (stepInterval) clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    return () => {
      isMounted = false;
      if (progressInterval) clearInterval(progressInterval);
      if (stepInterval) clearInterval(stepInterval);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [onComplete, steps.length]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-2xl px-8 space-y-8">
        {/* Logo/Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <Shield className="w-12 h-12 text-primary" />
              <div className="absolute inset-0 blur-lg bg-primary/30 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  OSINT
                </span>
                <span className="text-foreground ml-2">Tracker</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-4">
          {/* Current Step */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {React.createElement(steps[currentStep].icon, {
                className: 'w-5 h-5 text-primary animate-pulse'
              })}
              <span className="text-sm font-medium text-primary font-mono">
                {steps[currentStep].label}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            {/* Background track */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              {/* Progress fill with gradient */}
              <div
                className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* Animated glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
            
            {/* Glow effect underneath */}
            <div 
              className="absolute inset-0 -z-10 blur-md opacity-50"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(var(--primary)) ${progress}%, transparent)`,
              }}
            ></div>
          </div>

          {/* Percentage */}
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground font-mono">
              {progress}%
            </span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx <= currentStep;
            const isCompleted = idx < currentStep;
            
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'border-accent bg-accent/20'
                      : isActive
                      ? 'border-primary bg-primary/20 scale-110'
                      : 'border-border bg-transparent'
                  }`}
                >
                  <StepIcon
                    className={`w-5 h-5 transition-colors ${
                      isCompleted
                        ? 'text-accent'
                        : isActive
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-mono transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Step {idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;
