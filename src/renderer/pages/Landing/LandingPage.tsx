import React from 'react';

export interface LoadingState {
  stage: 'initial' | 'detecting_clients' | 'loading_configs' | 'ready' | 'error';
  progress: number;
  message: string;
}

interface LandingPageProps {
  loadingState: LoadingState;
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ loadingState, onGetStarted }) => {
  const isLoading = loadingState.stage !== 'ready' && loadingState.stage !== 'error';

  return (
    <div className="min-h-screen bg-base-200" data-theme="corporate">
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-base-100 rounded-2xl shadow-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-base-content mb-3">My MCP Manager</h1>
          <p className="text-base-content/70 text-lg">
            Manage Model Context Protocol servers across all your AI tools
          </p>
        </div>

        {/* Loading or Get Started */}
        {isLoading ? (
          <div className="card bg-base-100 shadow-xl w-full max-w-md">
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-base-content/70">Loading...</span>
                  <span className="text-sm font-semibold">{loadingState.progress}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={loadingState.progress} 
                  max="100"
                ></progress>
                <p className="text-center text-base-content/60 text-sm">
                  {loadingState.message}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button 
              className="btn btn-primary btn-lg mb-12"
              onClick={onGetStarted}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get Started
            </button>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              <div className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                <div className="card-body items-center text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <h3 className="card-title text-base">Manage Servers</h3>
                  <p className="text-sm text-base-content/60">
                    Add, edit, and configure MCP servers across all your AI clients
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                <div className="card-body items-center text-center">
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="card-title text-base">Sync Configurations</h3>
                  <p className="text-sm text-base-content/60">
                    Keep your MCP settings synchronized across Claude, VS Code, and more
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                <div className="card-body items-center text-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="card-title text-base">Easy Setup</h3>
                  <p className="text-sm text-base-content/60">
                    Simple interface for managing complex MCP configurations
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};