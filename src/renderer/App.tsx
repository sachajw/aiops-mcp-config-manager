import React, { useEffect, useState } from 'react';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/Dashboard/LandingPage';
import OverviewPage from './pages/Dashboard/OverviewPage';
import { useApplicationStore } from './store/applicationStore';
import { SimplifiedApp } from './SimplifiedApp';

// Feature flag - set to true to use simplified version
const USE_SIMPLIFIED_VERSION = true;

const App: React.FC = () => {
  // Use simplified version if flag is set
  if (USE_SIMPLIFIED_VERSION) {
    return <SimplifiedApp />;
  }
  
  // Original app code follows...
  const {
    clients,
    configurations,
    refreshClients,
    refreshConfiguration
  } = useApplicationStore();

  const [currentPage, setCurrentPage] = useState<string>('landing');

  // Initialize the app by loading clients
  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  const handleStartWizard = (wizardType: 'add-capability' | 'fix-issues' | 'import-config' | 'learn') => {
    console.log('Start wizard:', wizardType);
    // Wizard launching not yet implemented
  };

  const handleNavigateTo = (key: string) => {
    console.log('Navigate to:', key);
    setCurrentPage(key);
  };

  const handleLoadConfiguration = async (clientId: string) => {
    try {
      await refreshConfiguration(clientId);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshClients();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            clients={clients}
            configurations={configurations}
            onBack={() => setCurrentPage('landing')}
            onRefresh={handleRefresh}
            onLoadConfiguration={handleLoadConfiguration}
          />
        );
      default:
        return (
          <LandingPage
            clients={clients}
            configurations={configurations}
            onStartWizard={handleStartWizard}
            onNavigateTo={handleNavigateTo}
          />
        );
    }
  };

  return (
    <AppLayout>
      {renderCurrentPage()}
    </AppLayout>
  );
};

export default App;
